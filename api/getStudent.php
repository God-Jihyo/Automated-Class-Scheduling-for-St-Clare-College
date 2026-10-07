<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$student_id = isset($_GET['student_id']) ? $_GET['student_id'] : '';

if (empty($student_id)) { echo json_encode([]); exit; }

// 🚨 FIXED: Now perfectly matching the u.username to s.student_id (just like the teacher API!)
$sql = "
    SELECT s.*, 
           sec.section_name, 
           c.course_name,
           u.profile_picture
    FROM students s
    LEFT JOIN sections sec ON s.section = sec.section_id
    LEFT JOIN courses c ON s.course = c.id
    LEFT JOIN users u ON s.user_id = u.id OR u.username = s.student_id
    WHERE s.student_id = ?
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['error' => 'SQL prepare error']);
    exit;
}

$stmt->bind_param("s", $student_id);
$stmt->execute();
$res = $stmt->get_result();

$student_data = $res->fetch_assoc();

if ($student_data) {
    echo json_encode($student_data);
} else {
    echo json_encode([]);
}
?>