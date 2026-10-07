<?php
// thesis/api/getUserDetails.php
session_start();
error_reporting(0); // Hide errors to protect the JSON response
require_once '../config/db_connection.php';
header("Content-Type: application/json");

// 1. Grab original session variables so we don't break existing features
$dept = $_SESSION['dept'] ?? 'Unknown';
$name = $_SESSION['name'] ?? 'User';

// 2. Grab the User ID for our new Profile Picture feature
$user_id = $_SESSION['user_id'] ?? $_SESSION['account_id'] ?? '';
$profile_picture = 'default.png'; // Default fallback

// 3. If they are logged in, fetch their custom profile picture from the users table
if (!empty($user_id)) {
    try {
        $sql = "SELECT profile_picture FROM users WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                if (!empty($row['profile_picture'])) {
                    $profile_picture = $row['profile_picture'];
                }
            }
        }
    } catch (Exception $e) {
        // We catch errors silently so it doesn't crash the original name/dept feature
    }
}

// 4. Return the safely MERGED response!
if (isset($_SESSION['dept']) || isset($_SESSION['name']) || !empty($user_id)) {
    echo json_encode([
        "status" => "success",       // Keeps your OLD Javascript happy!
        "success" => true,           // Keeps our NEW Javascript happy!
        "department" => $dept,       // Original feature
        "full_name" => $name,        // Original feature
        "profile_picture" => $profile_picture // New feature!
    ]);
} else {
    echo json_encode([
        "status" => "error", 
        "success" => false,
        "message" => "Not logged in"
    ]);
}
?>