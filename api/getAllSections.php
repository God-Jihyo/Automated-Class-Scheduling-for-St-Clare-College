<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$course = $_GET['course'] ?? '';
$year   = $_GET['year'] ?? '';

// We changed this to SELECT * so it grabs the course and year_level too!
if ($course !== '' && $year !== '') {
    $stmt = $conn->prepare("SELECT * FROM sections WHERE course = ? AND year_level = ?");
    $stmt->bind_param("ss", $course, $year); // Changed to "ss" just in case course is a string
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query("SELECT * FROM sections");
}

$sections = [];
while ($row = $result->fetch_assoc()) {
    $sections[] = $row;
}

// FORCE SORTING: Use PHP's "Natural Sort" algorithm
usort($sections, function($a, $b) {
    return strnatcmp($a['section_name'], $b['section_name']);
});

echo json_encode($sections);
?>