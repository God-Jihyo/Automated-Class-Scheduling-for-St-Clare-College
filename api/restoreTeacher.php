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
    // 1. Restore Teacher (Forcing original teacher_id)
    $stmtResTeacher = $conn->prepare("
        INSERT INTO teachers (
            teacher_id, user_id, full_name, gender, email, 
            phone, department, position, specialization, 
            teaching_load, is_strict, preferred_day
        )
        SELECT 
            teacher_id, user_id, full_name, gender, email, 
            phone, department, position, specialization, 
            teaching_load, is_strict, preferred_day 
        FROM teachers_archive WHERE teacher_id = ?
    ");
    $stmtResTeacher->bind_param("i", $teacher_id);
    $stmtResTeacher->execute();

    // 2. Restore Subject Assignments (Forcing original ts_id)
    $stmtResTS = $conn->prepare("
        INSERT INTO teacher_subjects (ts_id, teacher_id, subject_id)
        SELECT original_ts_id, teacher_id, subject_id 
        FROM teacher_subjects_archive WHERE teacher_id = ?
    ");
    $stmtResTS->bind_param("i", $teacher_id);
    $stmtResTS->execute();

    // 3. Cleanup Archives
    $conn->query("DELETE FROM teachers_archive WHERE teacher_id = $teacher_id");
    $conn->query("DELETE FROM teacher_subjects_archive WHERE teacher_id = $teacher_id");

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Teacher restored with original ID and subjects."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Restore failed: " . $e->getMessage()]);
}
?>