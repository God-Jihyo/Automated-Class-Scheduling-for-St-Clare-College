<?php
// thesis/api/upload_profile_pic.php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);
require_once '../config/db_connection.php';
header('Content-Type: application/json');

ob_start();

try {
    // 1. Verify User Login
    $role = strtolower($_SESSION['role'] ?? '');
    
    // Grab the ID from the session (your login.php stores the DB 'id' inside this session variable)
    $user_id = $_SESSION['user_id'] ?? $_SESSION['account_id'] ?? '';

    if (empty($user_id) || empty($role)) {
        throw new Exception("Unauthorized. Please log in.");
    }

    // 2. Validate File Upload
    if (!isset($_FILES['profile_image']) || $_FILES['profile_image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("No file uploaded or an upload error occurred.");
    }

    $file = $_FILES['profile_image'];
    $allowed_types = ['image/jpeg', 'image/png', 'image/webp'];
    $max_size = 2 * 1024 * 1024; // 2MB

    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception("Invalid file type. Only JPG, PNG, and WEBP are allowed.");
    }

    if ($file['size'] > $max_size) {
        throw new Exception("File is too large. Maximum size is 2MB.");
    }

    // 3. Generate Unique Filename & Save to ASSETS folder
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $new_filename = $role . '_' . preg_replace('/[^a-zA-Z0-9]/', '', $user_id) . '_' . time() . '.' . $ext;
    
    $upload_path = '../assets/profiles/' . $new_filename;

    if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
        throw new Exception("Failed to save the image to the server.");
    }

    // 4. 🚨 PERFECT FIX: Change WHERE user_id to WHERE id 🚨
    $sql = "UPDATE `users` SET profile_picture = ? WHERE `id` = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    // Using "si" (String for filename, Integer for ID)
    $stmt->bind_param("si", $new_filename, $user_id);

    if (!$stmt->execute()) {
        throw new Exception("Database update failed.");
    }

    // Update the session so the new image loads instantly
    $_SESSION['profile_picture'] = $new_filename;

    echo json_encode(['success' => true, 'message' => 'Profile picture updated!', 'new_image' => $new_filename]);
    ob_end_flush();

} catch (Exception $e) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
