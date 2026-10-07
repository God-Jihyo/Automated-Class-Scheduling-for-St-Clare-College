<?php
// api/get_dashboard_stats.php

session_start();
require_once '../config/db_connection.php'; 

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$role = $_SESSION['role'];
$account_id = trim($_SESSION['account_id'] ?? $_SESSION['user_id']); // Use the new universal ID!
$today = date('l'); 

$response = [
    'success' => true,
    'total_subjects' => 0,
    'classes_today' => 0,
    'active_consultations' => 0, // NEW: Added variable
    'current_day' => $today,
    'debug_role' => $role
];

// --- NEW FEATURE: Count Active Consultations ---
// We count any message where the user is involved and the status is NOT closed.
$sql_consult = "SELECT COUNT(*) as consult_count 
                FROM consultations 
                WHERE (TRIM(sender_id) = ? OR TRIM(recipient_id) = ?) 
                AND status NOT IN ('resolved', 'declined')";

$stmt_consult = $conn->prepare($sql_consult);
$stmt_consult->bind_param("ss", $account_id, $account_id);
$stmt_consult->execute();
$response['active_consultations'] = $stmt_consult->get_result()->fetch_assoc()['consult_count'] ?? 0;
$stmt_consult->close();
// -----------------------------------------------

if ($role === 'student' && isset($_GET['section_id'])) {
    $section_id = $_GET['section_id']; 
    $response['debug_id'] = $section_id;

    // Total Subjects
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM section_subjects WHERE section_id = ?");
    $stmt->bind_param("s", $section_id); 
    $stmt->execute();
    $response['total_subjects'] = $stmt->get_result()->fetch_assoc()['total'] ?? 0;
    $stmt->close();

    // Classes Today
    $stmt = $conn->prepare("SELECT COUNT(*) as today_count FROM schedule WHERE section_id = ? AND day_of_week = ?");
    $stmt->bind_param("ss", $section_id, $today);
    $stmt->execute();
    $response['classes_today'] = $stmt->get_result()->fetch_assoc()['today_count'] ?? 0;
    $stmt->close();

} elseif ($role === 'teacher' && isset($_GET['teacher_id'])) {
    $teacher_id = $_GET['teacher_id'];
    $response['debug_id'] = $teacher_id;

    // Total Subjects
    $stmt = $conn->prepare("SELECT COUNT(DISTINCT subject_id) as total FROM schedule WHERE teacher_id = ?");
    $stmt->bind_param("s", $teacher_id);
    $stmt->execute();
    $response['total_subjects'] = $stmt->get_result()->fetch_assoc()['total'] ?? 0;
    $stmt->close();

    // Classes Today
    $stmt = $conn->prepare("SELECT COUNT(*) as today_count FROM schedule WHERE teacher_id = ? AND day_of_week = ?");
    $stmt->bind_param("ss", $teacher_id, $today);
    $stmt->execute();
    $response['classes_today'] = $stmt->get_result()->fetch_assoc()['today_count'] ?? 0;
    $stmt->close();
}

echo json_encode($response);
?>