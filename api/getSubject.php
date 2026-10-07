<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$id) {
    echo json_encode(["status" => "error", "message" => "Missing ID"]);
    exit;
}

// Join subjects and course_subjects to get all info
$sql = "
    SELECT s.id, s.code, s.subject_description, s.delivery_mode, 
           cs.course_id, cs.year_level
    FROM subjects s
    LEFT JOIN course_subjects cs ON s.id = cs.subject_id
    WHERE s.id = ?
    LIMIT 1
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$data = $stmt->get_result()->fetch_assoc();

if ($data) {
    echo json_encode($data);
} else {
    echo json_encode(["status" => "error", "message" => "Subject not found"]);
}
?>