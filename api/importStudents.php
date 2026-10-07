<?php
// thesis/api/importStudents.php
ob_start(); // START OUTPUT BUFFER
set_time_limit(300); 
ini_set('memory_limit', '256M');
error_reporting(0); // Turn off visual errors to prevent JSON crashes
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !is_array($data)) {
    ob_clean();
    echo json_encode(["success" => false, "message" => "No valid data received."]);
    exit;
}

$successCount = 0;
$errorCount = 0;
$enrollCount = 0;
$fullErrors = 0; // Tracks students who couldn't fit

$sectionsCache = []; 

$stmtStudent = $conn->prepare("INSERT INTO students (student_id, full_name, email, course, year_level, section) 
                               VALUES (?, ?, ?, ?, ?, ?) 
                               ON DUPLICATE KEY UPDATE 
                               full_name=VALUES(full_name), email=VALUES(email), course=VALUES(course), year_level=VALUES(year_level), section=VALUES(section)");

$enrollStmt = $conn->prepare("INSERT INTO student_enrollments (student_id, schedule_id) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_enrollments WHERE student_id=? AND schedule_id=?)");

// --- NEW: THE TRANSLATOR DICTIONARY ---
// This safely translates the Excel text ("BSCS") into the database number ("2")
$courseMap = [
    'BSBA' => 1, 'BSCS' => 2, 'BSTM' => 3, 'BSHM' => 4,
    'BEED' => 5, 'BSED-ENG' => 6, 'BSED-MATH' => 7, 'POLSCI' => 8
];

foreach ($data as $row) {
    $sid = !empty($row['student_id']) ? trim($row['student_id']) : '';
    $name = !empty($row['full_name']) ? trim($row['full_name']) : '';
    $email = !empty($row['email']) ? trim($row['email']) : '';
    $course = !empty($row['course']) ? trim(strtoupper($row['course'])) : '';
    $year = !empty($row['year_level']) ? (int)$row['year_level'] : 1;
    
    if (!$sid || !$name || !$course || !$year) {
        $errorCount++;
        continue;
    }

    // Do the translation! If it's BSCS, $courseId becomes 2.
    $courseId = isset($courseMap[$course]) ? $courseMap[$course] : $course;

    $assignedSectionName = null;
    $assignedSectionId = null;

    // --- RULE 1: PROTECT EXISTING STUDENTS ---
    $checkExisting = $conn->query("SELECT section FROM students WHERE student_id = '$sid' LIMIT 1");
    if ($checkExisting && $checkExisting->num_rows > 0) {
        $existing = $checkExisting->fetch_assoc();
        $assignedSectionName = $existing['section']; 
        
        // Use $courseId here so it finds the section properly
        $secIdQ = $conn->query("SELECT section_id FROM sections WHERE course='$courseId' AND year_level=$year AND section_name='$assignedSectionName' LIMIT 1");
        if($secIdQ && $secIdQ->num_rows > 0) {
            $assignedSectionId = $secIdQ->fetch_assoc()['section_id'];
        }
    } 
    // --- RULE 2: THE AUTO-SORTER FOR NEW STUDENTS ---
    else {
        $cacheKey = $courseId . "_" . $year;
        
        if (!isset($sectionsCache[$cacheKey])) {
            $sectionsCache[$cacheKey] = [];
            
            // Look up sections using the NUMBER ID
            $secQ = $conn->query("SELECT section_id, section_name FROM sections WHERE course='$courseId' AND year_level=$year ORDER BY section_name ASC");
            if ($secQ) {
                while($secRow = $secQ->fetch_assoc()) {
                    $sName = $secRow['section_name'];
                    
                    // Look up students using the TEXT string
                    $cQ = $conn->query("SELECT COUNT(*) as c FROM students WHERE course='$course' AND year_level=$year AND section='$sName'");
                    $count = $cQ ? (int)$cQ->fetch_assoc()['c'] : 0;
                    
                    $sectionsCache[$cacheKey][] = [
                        'id' => $secRow['section_id'],
                        'name' => $sName,
                        'count' => $count
                    ];
                }
            }
        }

        // Find the first section UNDER 45 students
        foreach ($sectionsCache[$cacheKey] as &$secData) {
            if ($secData['count'] < 45) {
                $assignedSectionName = $secData['name'];
                $assignedSectionId = $secData['id'];
                $secData['count']++; 
                break;
            }
        }
    }

    // --- RULE 3: CAPACITY CHECK ---
    if (!$assignedSectionName || !$assignedSectionId) {
        $fullErrors++;
        continue; 
    }

    // --- RULE 4: SAVE & ENROLL ---
    if ($stmtStudent) {
        $stmtStudent->bind_param("ssssis", $sid, $name, $email, $course, $year, $assignedSectionName);
        if ($stmtStudent->execute()) {
            $successCount++;
            
            $schedQ = $conn->query("SELECT schedule_id FROM schedule WHERE section_id = $assignedSectionId");
            if ($schedQ) {
                while ($sRow = $schedQ->fetch_assoc()) {
                    $sched_id = $sRow['schedule_id'];
                    $enrollStmt->bind_param("sisi", $sid, $sched_id, $sid, $sched_id);
                    if ($enrollStmt->execute() && $enrollStmt->affected_rows > 0) {
                        $enrollCount++;
                    }
                }
            }
        } else {
            $errorCount++;
        }
    }
}

if ($stmtStudent) $stmtStudent->close();
if ($enrollStmt) $enrollStmt->close();

$msg = "Import complete! Saved $successCount students and successfully filled $enrollCount subject seats.";
if ($fullErrors > 0) {
    $msg .= "\n\n⚠️ WARNING: $fullErrors students were SKIPPED because all sections for their course/year reached the strict 45-student limit! Please create a new section in the dashboard and re-import.";
}

$response = [
    "success" => true,
    "status" => "success", 
    "message" => $msg
];

ob_clean(); 
echo json_encode($response);
$conn->close();
exit;
?>