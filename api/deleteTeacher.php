<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$teacher_id = intval($data['teacher_id'] ?? 0);

if (!$teacher_id) {
    echo json_encode(["status" => "error", "message" => "Missing Teacher ID"]);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Archive Subject Assignments
    $stmtTS = $conn->prepare("
        INSERT INTO teacher_subjects_archive (original_ts_id, teacher_id, subject_id)
        SELECT ts_id, teacher_id, subject_id 
        FROM teacher_subjects WHERE teacher_id = ?
    ");
    $stmtTS->bind_param("i", $teacher_id);
    $stmtTS->execute();

    // 2. Archive Teacher Profile (Using your exact columns)
    $stmtTeacher = $conn->prepare("
        INSERT INTO teachers_archive (
            teacher_id, user_id, full_name, gender, email, 
            phone, department, position, specialization, 
            teaching_load, is_strict, preferred_day
        )
        SELECT 
            teacher_id, user_id, full_name, gender, email, 
            phone, department, position, specialization, 
            teaching_load, is_strict, preferred_day 
        FROM teachers WHERE teacher_id = ?
    ");
    $stmtTeacher->bind_param("i", $teacher_id);
    $stmtTeacher->execute();

    // 3. Delete from main tables
    $stmtDelTS = $conn->prepare("DELETE FROM teacher_subjects WHERE teacher_id = ?");
    $stmtDelTS->bind_param("i", $teacher_id);
    $stmtDelTS->execute();

    $stmtDelTeacher = $conn->prepare("DELETE FROM teachers WHERE teacher_id = ?");
    $stmtDelTeacher->bind_param("i", $teacher_id);
    $stmtDelTeacher->execute();

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Teacher and assignments archived."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Archive Error: " . $e->getMessage()]);
}
?>