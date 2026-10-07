<?php
// api/submit_reply.php
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// FIX: Use the actual Teacher/Student ID from our updated login.php!
$sender_id = trim($_SESSION['account_id'] ?? $_SESSION['user_id']);
$sender_role = strtolower(trim($_SESSION['role']));

$data = json_decode(file_get_contents("php://input"), true);
$consultation_id = $data['consultation_id'] ?? '';
$message = $data['message'] ?? '';

if (empty($consultation_id) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Message cannot be empty.']);
    exit;
}

$sql = "INSERT INTO consultation_replies (consultation_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("isss", $consultation_id, $sender_id, $sender_role, $message);

if ($stmt->execute()) {
    $update_sql = "UPDATE consultations SET status = 'in_progress' WHERE id = ? AND status = 'pending'";
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("i", $consultation_id);
    $update_stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Reply sent!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to send reply.']);
}
$stmt->close();
$conn->close();
?>