<?php
// thesis/api/getDashboardCounts.php
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$data = [
    'students' => 0,
    'teachers' => 0,
    'rooms' => 0,
    'sections' => 0
];

// Count Students
$q1 = $conn->query("SELECT COUNT(*) as count FROM students");
if ($q1) $data['students'] = (int)$q1->fetch_assoc()['count'];

// Count Teachers
$q2 = $conn->query("SELECT COUNT(*) as count FROM teachers");
if ($q2) $data['teachers'] = (int)$q2->fetch_assoc()['count'];

// Count Rooms
$q3 = $conn->query("SELECT COUNT(*) as count FROM rooms"); 
if ($q3) $data['rooms'] = (int)$q3->fetch_assoc()['count'];

// THE FIX: The corrected Section Fallback Logic
$q4 = $conn->query("SELECT COUNT(*) as count FROM sections");
$sectionCount = 0;

if ($q4) {
    $sectionCount = (int)$q4->fetch_assoc()['count'];
}

// If the official sections table actually has data, use it!
if ($sectionCount > 0) {
    $data['sections'] = $sectionCount;
} else {
    // SMART FALLBACK: If the official table is 0, count the distinct sections from the imported students!
    $q4_fallback = $conn->query("SELECT COUNT(DISTINCT section) as count FROM students WHERE section IS NOT NULL AND section != ''");
    if ($q4_fallback) {
        $data['sections'] = (int)$q4_fallback->fetch_assoc()['count'];
    }
}

echo json_encode($data);
$conn->close();
?>