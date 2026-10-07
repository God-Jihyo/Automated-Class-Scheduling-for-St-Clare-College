<?php
// api/update_status.php

session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Read the JSON data
$data = json_decode(file_get_contents("php://input"), true);
$consultation_id = $data['consultation_id'] ?? '';
$new_status = $data['status'] ?? '';

if (empty($consultation_id) || empty($new_status)) {
    echo json_encode(['success' => false, 'message' => 'Missing data.']);
    exit;
}

// Security: Allow 'disputed' to pass through!
$allowed_statuses = ['pending', 'in_progress', 'resolved', 'declined', 'disputed'];

if (!in_array($new_status, $allowed_statuses)) {
    echo json_encode(['success' => false, 'message' => 'Invalid status.']);
    exit;
}

// Update the database
$sql = "UPDATE consultations SET status = ? WHERE id = ?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'SQL Error: ' . $conn->error]);
    exit;
}

$stmt->bind_param("si", $new_status, $consultation_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Status updated successfully!']);
} else {
    // If it fails, send the EXACT error back to the screen so we know why!
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>