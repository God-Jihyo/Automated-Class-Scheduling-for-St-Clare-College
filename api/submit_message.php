<?php
// api/submit_message.php
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

$recipient_id = trim($_POST['recipient_id'] ?? '');
$recipient_role = strtolower(trim($_POST['recipient_role'] ?? ''));
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');

if (empty($recipient_id) || empty($recipient_role) || empty($subject) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields.']);
    exit;
}

$file_path = null;
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = '../uploads/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
    $file_extension = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
    $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    if (in_array($file_extension, $allowed_extensions)) {
        $safe_filename = 'msg_' . time() . '_' . rand(1000, 9999) . '.' . $file_extension;
        $target_file = $upload_dir . $safe_filename;
        if (move_uploaded_file($_FILES['file']['tmp_name'], $target_file)) {
            $file_path = 'uploads/' . $safe_filename; 
        }
    }
}

$sql = "INSERT INTO consultations (sender_id, sender_role, recipient_id, recipient_role, subject, message, attachment_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sssssss", $sender_id, $sender_role, $recipient_id, $recipient_role, $subject, $message, $file_path);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to send message.']);
}
$stmt->close();
$conn->close();
?>