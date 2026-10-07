<?php
// thesis/api/sync_enrollments.php
require_once '../config/db_connection.php';
echo "<div style='font-family: sans-serif; padding: 20px;'>";
echo "<h2>Syncing Old Students to New Subject System...</h2>";

$stmt = $conn->query("SELECT student_id, course, year_level, section FROM students WHERE section != ''");
$ticketCount = 0;
$studentCount = 0;

if (!$stmt || $stmt->num_rows == 0) {
    echo "<p style='color:red;'>No students found in the database with an assigned section!</p>";
    exit;
}

while ($student = $stmt->fetch_assoc()) {
    $sid = $student['student_id'];
    $y = (int)$student['year_level'];
    $s = trim($student['section']); // e.g., "A1" or "1A"

    // Smarter query: Match by year level and section name (bypasses course ID mismatches)
    $secQ = $conn->query("SELECT section_id FROM sections WHERE year_level=$y AND section_name='$s' LIMIT 1");
    
    if ($secQ && $secQ->num_rows > 0) {
        $sec_id = $secQ->fetch_assoc()['section_id'];
        $foundSubjects = 0;
        
        $schedQ = $conn->query("SELECT schedule_id FROM schedule WHERE section_id = $sec_id");
        while ($sched = $schedQ->fetch_assoc()) {
            $sch_id = $sched['schedule_id'];
            
            // Check if they already have a ticket
            $chk = $conn->query("SELECT 1 FROM student_enrollments WHERE student_id='$sid' AND schedule_id=$sch_id");
            if ($chk->num_rows == 0) {
                // Give them the ticket!
                $conn->query("INSERT INTO student_enrollments (student_id, schedule_id) VALUES ('$sid', $sch_id)");
                $ticketCount++;
                $foundSubjects++;
            }
        }
        
        if ($foundSubjects > 0) {
            $studentCount++;
            echo "<p style='color:green; margin: 5px 0;'>✔ Success: Enrolled Student <b>$sid</b> into <b>$foundSubjects</b> subjects for Section $s</p>";
        } else {
            echo "<p style='color:gray; margin: 5px 0;'>- Student <b>$sid</b> already has their tickets.</p>";
        }
    } else {
        echo "<p style='color:red; margin: 5px 0;'>✖ Error: Could not find the generated schedule for Student <b>$sid</b> (Looking for Year $y, Section $s)</p>";
    }
}

echo "<hr>";
echo "<h3>✅ Done! Successfully processed $studentCount students and generated $ticketCount subject tickets.</h3>";
echo "</div>";
?>