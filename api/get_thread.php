<?php
// api/get_thread.php
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = trim($_SESSION['account_id'] ?? $_SESSION['user_id']);
$consultation_id = trim($_GET['id'] ?? '');

if (empty($consultation_id)) {
    echo json_encode(['success' => false, 'message' => 'Missing Thread ID.']);
    exit;
}

// NEW FEATURE: Added the 48-hour CASE check to the main thread query!
$sql = "SELECT c.*, 
        CASE WHEN c.status = 'pending' AND c.created_at < NOW() - INTERVAL 48 HOUR THEN 'overdue' ELSE c.status END as status,
        COALESCE(t1.full_name, s1.full_name, CONCAT('ID: ', c.sender_id)) as sender_name,
        COALESCE(t2.full_name, s2.full_name, CONCAT('ID: ', c.recipient_id)) as recipient_name
        FROM consultations c
        LEFT JOIN teachers t1 ON LOWER(TRIM(c.sender_role)) = 'teacher' AND TRIM(c.sender_id) COLLATE utf8mb4_general_ci = TRIM(t1.teacher_id) COLLATE utf8mb4_general_ci
        LEFT JOIN students s1 ON LOWER(TRIM(c.sender_role)) = 'student' AND TRIM(c.sender_id) COLLATE utf8mb4_general_ci = TRIM(s1.student_id) COLLATE utf8mb4_general_ci
        LEFT JOIN teachers t2 ON LOWER(TRIM(c.recipient_role)) = 'teacher' AND TRIM(c.recipient_id) COLLATE utf8mb4_general_ci = TRIM(t2.teacher_id) COLLATE utf8mb4_general_ci
        LEFT JOIN students s2 ON LOWER(TRIM(c.recipient_role)) = 'student' AND TRIM(c.recipient_id) COLLATE utf8mb4_general_ci = TRIM(s2.student_id) COLLATE utf8mb4_general_ci
        WHERE c.id = ? AND (TRIM(c.sender_id) = ? OR TRIM(c.recipient_id) = ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iss", $consultation_id, $user_id, $user_id);
$stmt->execute();
$main_result = $stmt->get_result();

if ($main_result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Thread not found or access denied.']);
    exit;
}
$main_data = $main_result->fetch_assoc();

$replies = [];
$sql_replies = "SELECT r.*, 
        COALESCE(t.full_name, s.full_name, CONCAT('ID: ', r.sender_id)) as sender_name
        FROM consultation_replies r
        LEFT JOIN teachers t ON LOWER(TRIM(r.sender_role)) = 'teacher' AND TRIM(r.sender_id) COLLATE utf8mb4_general_ci = TRIM(t.teacher_id) COLLATE utf8mb4_general_ci
        LEFT JOIN students s ON LOWER(TRIM(r.sender_role)) = 'student' AND TRIM(r.sender_id) COLLATE utf8mb4_general_ci = TRIM(s.student_id) COLLATE utf8mb4_general_ci
        WHERE r.consultation_id = ?
        ORDER BY r.created_at ASC";

$stmt_rep = $conn->prepare($sql_replies);
$stmt_rep->bind_param("i", $consultation_id);
$stmt_rep->execute();
$rep_result = $stmt_rep->get_result();

while ($row = $rep_result->fetch_assoc()) {
    $replies[] = $row;
}

echo json_encode(['success' => true, 'current_user_id' => $user_id, 'main' => $main_data, 'replies' => $replies]);
$stmt->close();
$stmt_rep->close();
$conn->close();
?>