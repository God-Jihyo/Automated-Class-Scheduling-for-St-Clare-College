<?php
// api/get_messages.php
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = trim($_SESSION['account_id'] ?? $_SESSION['user_id']);
$folder = $_GET['folder'] ?? 'inbox';
$messages = [];

// NEW FEATURE: We use SQL's "CASE" to dynamically calculate if a message is over 48 hours old!
if ($folder === 'inbox') {
    $sql = "SELECT c.id, c.subject, c.created_at, c.sender_role as person_role,
                   CASE WHEN c.status = 'pending' AND c.created_at < NOW() - INTERVAL 48 HOUR THEN 'overdue' ELSE c.status END as status,
                   COALESCE(t.full_name, s.full_name, CONCAT('ID: ', c.sender_id)) as person_name
            FROM consultations c
            LEFT JOIN teachers t ON LOWER(TRIM(c.sender_role)) = 'teacher' AND TRIM(c.sender_id) COLLATE utf8mb4_general_ci = TRIM(t.teacher_id) COLLATE utf8mb4_general_ci
            LEFT JOIN students s ON LOWER(TRIM(c.sender_role)) = 'student' AND TRIM(c.sender_id) COLLATE utf8mb4_general_ci = TRIM(s.student_id) COLLATE utf8mb4_general_ci
            WHERE TRIM(c.recipient_id) COLLATE utf8mb4_general_ci = ?
            ORDER BY c.created_at DESC";
} else {
    $sql = "SELECT c.id, c.subject, c.created_at, c.recipient_role as person_role,
                   CASE WHEN c.status = 'pending' AND c.created_at < NOW() - INTERVAL 48 HOUR THEN 'overdue' ELSE c.status END as status,
                   COALESCE(t.full_name, s.full_name, CONCAT('ID: ', c.recipient_id)) as person_name
            FROM consultations c
            LEFT JOIN teachers t ON LOWER(TRIM(c.recipient_role)) = 'teacher' AND TRIM(c.recipient_id) COLLATE utf8mb4_general_ci = TRIM(t.teacher_id) COLLATE utf8mb4_general_ci
            LEFT JOIN students s ON LOWER(TRIM(c.recipient_role)) = 'student' AND TRIM(c.recipient_id) COLLATE utf8mb4_general_ci = TRIM(s.student_id) COLLATE utf8mb4_general_ci
            WHERE TRIM(c.sender_id) COLLATE utf8mb4_general_ci = ?
            ORDER BY c.created_at DESC";
}

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $user_id);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

echo json_encode(['success' => true, 'messages' => $messages]);
$stmt->close();
$conn->close();
?>