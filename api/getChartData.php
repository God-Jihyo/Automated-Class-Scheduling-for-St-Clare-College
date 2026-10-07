<?php
// thesis/api/getChartData.php
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$chartData = [
    'students' => ['labels' => [], 'values' => []],
    'rooms'    => ['labels' => [], 'values' => [], 'total' => 0]
];

// 1. Chart 1: Students per Section (Now with Course Names!)
$studentQuery = "
    SELECT 
        COALESCE(c.course_name, s.course) AS display_course, 
        s.section, 
        COUNT(s.student_id) as total 
    FROM students s
    LEFT JOIN courses c ON s.course = c.id
    WHERE s.section IS NOT NULL AND s.section != '' 
    GROUP BY display_course, s.section 
    ORDER BY display_course ASC, s.section ASC
";
$studentResult = $conn->query($studentQuery);

if ($studentResult) {
    while ($row = $studentResult->fetch_assoc()) {
        $course = !empty(trim($row['display_course'])) ? trim($row['display_course']) : 'Course';
        $section = !empty(trim($row['section'])) ? trim($row['section']) : '';
        
        // Glue the Course and Section together (e.g., "BSCS" + " " + "1A")
        $chartData['students']['labels'][] = $course . ' ' . $section;
        $chartData['students']['values'][] = (int)$row['total'];
    }
}

// 2. Chart 2: Rooms per Department / Course (Untouched and Safe!)
$totalRooms = 0;

$roomQuery = "SELECT department, COUNT(id) as total FROM rooms GROUP BY department";
$roomResult = $conn->query($roomQuery);

if ($roomResult) {
    while ($row = $roomResult->fetch_assoc()) {
        $dept = !empty(trim($row['department'])) ? trim($row['department']) : 'Shared / General';
        $chartData['rooms']['labels'][] = $dept;
        $chartData['rooms']['values'][] = (int)$row['total'];
        $totalRooms += (int)$row['total'];
    }
} else {
    $roomQueryBackup = "SELECT course, COUNT(id) as total FROM rooms GROUP BY course";
    $roomResultBackup = $conn->query($roomQueryBackup);
    
    if ($roomResultBackup) {
        while ($row = $roomResultBackup->fetch_assoc()) {
            $dept = !empty(trim($row['course'])) ? trim($row['course']) : 'Shared / General';
            $chartData['rooms']['labels'][] = $dept;
            $chartData['rooms']['values'][] = (int)$row['total'];
            $totalRooms += (int)$row['total'];
        }
    } else {
        $allRooms = $conn->query("SELECT COUNT(id) as total FROM rooms");
        if ($allRooms) {
            $count = (int)$allRooms->fetch_assoc()['total'];
            $chartData['rooms']['labels'][] = 'General Rooms';
            $chartData['rooms']['values'][] = $count;
            $totalRooms += $count;
        }
    }
}

$chartData['rooms']['total'] = $totalRooms;

echo json_encode($chartData);
$conn->close();
?>