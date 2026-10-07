<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$course_id = $_GET['course'] ?? '';
$year_level = $_GET['year'] ?? '';

// If data is missing, return empty list
if ($course_id === '' || $year_level === '') {
    echo json_encode([]);
    exit;
}

// Fetch sections matching BOTH Course and Year
$sql = "SELECT section_id, section_name 
        FROM sections 
        WHERE course = ? AND year_level = ? 
        ORDER BY section_name ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $course_id, $year_level);
$stmt->execute();
$result = $stmt->get_result();

$sections = [];
while ($row = $result->fetch_assoc()) {
    $sections[] = $row;
}

echo json_encode($sections);
?>