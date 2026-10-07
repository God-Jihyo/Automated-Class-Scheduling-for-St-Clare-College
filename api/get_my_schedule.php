<?php
// thesis/api/get_my_schedule.php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);
require_once '../config/db_connection.php';
header('Content-Type: application/json');

$role = strtolower(trim($_SESSION['role'] ?? 'student')); 
$id = $_SESSION['account_id'] ?? null;
$raw_section = null; 

if ($role === 'student') {
    $username = $_SESSION['username'] ?? $id ?? '';
    $q = $conn->query("SELECT student_id, section FROM students WHERE email = '$username' OR student_id = '$username' LIMIT 1");
    if ($r = $q->fetch_assoc()) {
        $id = $r['student_id'];
        $raw_section = $r['section'];
    }
} else {
    $raw_section = $_SESSION['section_id'] ?? null; 
}

$schedule = [];

try {
    if ($role === 'teacher' || $role === 'dept_head') {
        $sql = "SELECT s.schedule_id, s.day_of_week, s.time_slot, s.gmeet_link, s.classroom_code,
                       COALESCE(sub.subject_description, 'Unknown Subject') as subject_name,
                       COALESCE(sub.code, '') as subject_code,
                       COALESCE(r.room_name, 'Online') as room_name,
                       COALESCE(sec.section_name, 'Unknown Section') as detail
                FROM schedule s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                LEFT JOIN rooms r ON s.room_id = r.id
                LEFT JOIN sections sec ON s.section_id = sec.section_id
                WHERE s.teacher_id = ? ORDER BY s.day_of_week ASC, s.time_slot ASC";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed: ".$conn->error);
        $stmt->bind_param("s", $id);
    } else {
        // 🚨 BILINGUAL FIX: Check BOTH section_id and section_name!
        $sql = "SELECT s.day_of_week, s.time_slot, s.gmeet_link, s.classroom_code,
                       COALESCE(sub.subject_description, 'Unknown Subject') as subject_name,
                       COALESCE(sub.code, '') as subject_code,
                       COALESCE(r.room_name, 'Online') as room_name,
                       COALESCE(t.full_name, 'TBA') as detail
                FROM schedule s
                JOIN sections sec ON s.section_id = sec.section_id
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                LEFT JOIN rooms r ON s.room_id = r.id
                LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
                WHERE sec.section_id = ? OR sec.section_name = ? 
                ORDER BY s.day_of_week ASC, s.time_slot ASC";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed: ".$conn->error);
        // Bind it twice
        $stmt->bind_param("ss", $raw_section, $raw_section);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $dayNames = [1=>'Monday', 2=>'Tuesday', 3=>'Wednesday', 4=>'Thursday', 5=>'Friday', 6=>'Saturday', 7=>'Sunday'];

    while ($row = $result->fetch_assoc()) {
        $d = $row['day_of_week'];
        if (is_numeric($d) && isset($dayNames[(int)$d])) $row['day_of_week'] = $dayNames[(int)$d];
        $schedule[] = $row;
    }

    echo json_encode(['success' => true, 'role' => $role, 'data' => $schedule]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>