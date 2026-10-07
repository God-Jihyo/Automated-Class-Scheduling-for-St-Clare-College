<?php
// thesis/api/get_enrolled_subjects.php
session_start();
error_reporting(0);
require_once '../config/db_connection.php';
header('Content-Type: application/json');

$role = strtolower(trim($_SESSION['role'] ?? 'student')); 

if ($role !== 'student') {
    echo json_encode(['success' => false, 'data' => [], 'total_units' => 0]);
    exit;
}

// 1. Get the raw section value from the student (could be '59' or '1A')
$raw_section = null;
$username = $_SESSION['username'] ?? $_SESSION['account_id'] ?? '';
$q = $conn->query("SELECT section FROM students WHERE email = '$username' OR student_id = '$username' LIMIT 1");
if ($r = $q->fetch_assoc()) {
    $raw_section = $r['section'];
}

if (!$raw_section) {
    echo json_encode(['success' => false, 'message' => 'No section assigned to this student.']);
    exit;
}

try {
    // 🚨 BILINGUAL FIX: Check BOTH section_id and section_name!
    $sql = "SELECT sub.code as course_no, sub.subject_description, sub.units, s.time_slot,
                   GROUP_CONCAT(s.day_of_week SEPARATOR '/') as days,
                   COALESCE(r.room_name, 'Online') as room_name
            FROM schedule s
            JOIN sections sec ON s.section_id = sec.section_id
            JOIN subjects sub ON s.subject_id = sub.id
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE sec.section_id = ? OR sec.section_name = ?
            GROUP BY sub.id, s.time_slot, r.room_name
            ORDER BY sub.subject_description ASC";

    $stmt = $conn->prepare($sql);
    // Bind it twice so it checks both columns
    $stmt->bind_param("ss", $raw_section, $raw_section);
    $stmt->execute();
    $result = $stmt->get_result();

    $subjects = [];
    $total_units = 0;
    $dayMap = ['1'=>'M', '2'=>'T', '3'=>'W', '4'=>'TH', '5'=>'F', '6'=>'S', 'Monday'=>'M', 'Tuesday'=>'T', 'Wednesday'=>'W', 'Thursday'=>'TH', 'Friday'=>'F', 'Saturday'=>'S'];

    while ($row = $result->fetch_assoc()) {
        $raw_days = explode('/', $row['days']);
        $short_days = [];
        foreach($raw_days as $d) {
            $key = trim($d);
            $short_days[] = $dayMap[$key] ?? $key;
        }
        $row['days'] = implode('', array_unique($short_days)); 
        $subjects[] = $row;
        $total_units += (int)$row['units'];
    }

    echo json_encode(['success' => true, 'data' => $subjects, 'total_units' => $total_units]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>