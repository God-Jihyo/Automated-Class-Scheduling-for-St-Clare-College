<?php
// thesis/api/getTeacherConflicts.php
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/db_connection.php';
session_start();

// 🚨 CRITICAL FIX: Because of check_session.php, we know account_id IS the teacher_id!
$teacherId = $_SESSION['account_id'] ?? null;

if (!$teacherId) {
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}

// Check the database directly using the proper Teacher ID
$stmt = $conn->prepare("SELECT * FROM conflict_resolutions WHERE teacher_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1");
$stmt->bind_param("s", $teacherId);
$stmt->execute();
$res = $stmt->get_result();

$data = [];
if ($row = $res->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode(['success' => true, 'data' => $data]);
$conn->close();
?>