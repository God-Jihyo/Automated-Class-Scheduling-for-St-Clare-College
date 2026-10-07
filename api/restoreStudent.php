<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$student_id = $data['student_id'] ?? '';

if (empty($student_id)) {
    echo json_encode(["status" => "error", "message" => "Missing student_id"]);
    exit;
}

$conn->begin_transaction();

try {

    // 1. Restore back to students
    $stmtRestore = $conn->prepare("
        INSERT INTO students (
            student_id, user_id, full_name, gender, email, phone,
            course, year_level, section
        )
        SELECT 
            student_id, user_id, full_name, gender, email, phone,
            course, year_level, section
        FROM students_archive
        WHERE student_id = ?
    ");
    $stmtRestore->bind_param("s", $student_id);
    $stmtRestore->execute();

    if ($stmtRestore->affected_rows === 0) {
        throw new Exception("Archived student not found.");
    }

    // 2. Remove from archive
    $stmtDelete = $conn->prepare("DELETE FROM students_archive WHERE student_id = ?");
    $stmtDelete->bind_param("s", $student_id);
    $stmtDelete->execute();

    $conn->commit();

    echo json_encode(["status" => "success", "message" => "Student restored successfully"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>