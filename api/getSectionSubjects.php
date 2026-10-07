<?php
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_GET['section_id'])) {
    echo json_encode([]);
    exit;
}
$section_id = (int)$_GET['section_id'];

// Get ONLY the subjects assigned to this specific section
$query = "SELECT sub.id, sub.code, sub.subject_description, sub.hours_per_week, sub.delivery_mode 
          FROM section_subjects ss 
          JOIN subjects sub ON ss.subject_id = sub.id 
          WHERE ss.section_id = $section_id";

$result = $conn->query($query);
$subjects = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $subjects[] = $row;
    }
}

echo json_encode($subjects);
$conn->close();
?>