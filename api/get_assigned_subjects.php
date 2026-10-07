<?php
// api/get_assigned_subjects.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$teacher_id = trim($_SESSION['account_id'] ?? $_SESSION['user_id']); 

try {
    // 🚨 PERFECT FIX: Your database uses 'code'. We pull it and rename it for JS.
    $sql = "SELECT 
                sub.code as course_no,
                sub.subject_description,
                sub.units,
                s.time_slot,
                GROUP_CONCAT(s.day_of_week SEPARATOR '/') as days,
                COALESCE(r.room_name, 'Online') as room_name,
                COALESCE(sec.section_name, 'TBA') as section_name
            FROM schedule s
            JOIN subjects sub ON s.subject_id = sub.id
            LEFT JOIN rooms r ON s.room_id = r.id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            WHERE s.teacher_id = ?
            GROUP BY sub.id, s.time_slot, r.room_name, sec.section_name
            ORDER BY sub.subject_description ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("SQL Prepare Error: " . $conn->error);
    
    $stmt->bind_param("s", $teacher_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $subjects = [];
    $total_units = 0;
    $dayMap = ['Monday'=>'M', 'Tuesday'=>'T', 'Wednesday'=>'W', 'Thursday'=>'TH', 'Friday'=>'F', 'Saturday'=>'S', 'Sunday'=>'Su'];

    while ($row = $result->fetch_assoc()) {
        $raw_days = explode('/', $row['days']);
        $short_days = [];
        foreach($raw_days as $d) $short_days[] = $dayMap[trim($d)] ?? trim($d);
        $row['days'] = implode('', array_unique($short_days)); 

        $subjects[] = $row;
        $total_units += (int)$row['units'];
    }

    echo json_encode(['success' => true, 'data' => $subjects, 'total_units' => $total_units]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'PHP Error: ' . $e->getMessage()]);
}
?>