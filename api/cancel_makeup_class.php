<?php
// api/cancel_makeup_class.php

error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

// Security: Only allow teachers to cancel classes
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$title = $_POST['title'] ?? '';
$date = $_POST['date'] ?? '';

if (empty($title) || empty($date)) {
    echo json_encode(['success' => false, 'message' => 'Missing event details.']);
    exit;
}

try {
    // We locate the exact make-up class using its title and date
    $sql = "DELETE FROM campus_events WHERE title = ? AND start_date = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $title, $date);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Make-Up Class cancelled and room freed.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database error: Could not delete.']);
    }
    
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}

$conn->close();
?>