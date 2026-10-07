<?php
// api/get_notifications.php
error_reporting(0); // Kept at 0 so it never breaks the JSON data
ini_set('display_errors', 0);
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// 🚨 THE TWIN CATCHER: Grab BOTH the Teacher ID and the User ID
$account_id = $_SESSION['account_id'] ?? $_SESSION['user_id'];
$user_id = $_SESSION['user_id']; 

// Look for notifications under EITHER ID so it never misses!
$sql = "SELECT * FROM notifications WHERE account_id = ? OR account_id = ? ORDER BY created_at DESC LIMIT 20";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $account_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

$notifications = [];
$unread_count = 0;

while ($row = $result->fetch_assoc()) {
    $row['formatted_time'] = date("M j, g:i A", strtotime($row['created_at']));
    $notifications[] = $row;
    if ($row['is_read'] == 0) {
        $unread_count++;
    }
}

echo json_encode([
    'success' => true,
    'data' => $notifications,
    'unread' => $unread_count
]);

$stmt->close();
$conn->close();
?>