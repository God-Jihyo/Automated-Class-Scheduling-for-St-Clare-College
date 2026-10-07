<?php
// api/change_password.php
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['user_id'];
$current_pass = $_POST['current_pass'] ?? '';
$new_pass = $_POST['new_pass'] ?? '';

try {
    // 1. Fetch current password from DB
    $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    // 2. OLD SCHOOL CHECK: Literal word-for-word comparison
    if ($user && $current_pass === $user['password']) {
        
        // 3. UPDATE: Save the new password as a plain word
        $update_stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
        $update_stmt->bind_param("si", $new_pass, $user_id);
        
        if ($update_stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Password updated successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Database error.']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Incorrect current password.']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}
$conn->close();
?>