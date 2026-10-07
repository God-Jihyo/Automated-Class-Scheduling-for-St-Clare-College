<?php
// api/mark_notifications_read.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$account_id = $_SESSION['account_id'] ?? $_SESSION['user_id'];

// Flip all unread notifications to read (1) for this specific user
$sql = "UPDATE notifications SET is_read = 1 WHERE account_id = ? AND is_read = 0";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $account_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Database error']);
}

$stmt->close();
$conn->close();
?>