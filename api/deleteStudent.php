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

    // 1. Get user_id
    $stmtGet = $conn->prepare("SELECT user_id FROM students WHERE student_id = ?");
    $stmtGet->bind_param("s", $student_id);
    $stmtGet->execute();
    $res = $stmtGet->get_result();

    $user_id = null;
    if ($row = $res->fetch_assoc()) {
        $user_id = $row['user_id'];
    }

    // 2. Move student to archive (EXPLICIT columns)
    $stmtArchive = $conn->prepare("
        INSERT INTO students_archive (
            student_id, user_id, full_name, gender, email, phone,
            course, year_level, section,
            archived_at, archived_by
        )
        SELECT 
            student_id, user_id, full_name, gender, email, phone,
            course, year_level, section,
            NOW(), NULL
        FROM students
        WHERE student_id = ?
    ");
    $stmtArchive->bind_param("s", $student_id);
    $stmtArchive->execute();

    if ($stmtArchive->affected_rows === 0) {
        throw new Exception("Student not found or already archived.");
    }

    // 3. Delete from main table
    $stmtDelete = $conn->prepare("DELETE FROM students WHERE student_id = ?");
    $stmtDelete->bind_param("s", $student_id);
    $stmtDelete->execute();

    // 4. Delete linked user (optional)
    if (!empty($user_id)) {
        $stmtUser = $conn->prepare("DELETE FROM users WHERE ID = ?");
        $stmtUser->bind_param("i", $user_id);
        $stmtUser->execute();
    }

    // 5. Log
    $logDesc = "Archived Student ID: $student_id";
    $stmtLog = $conn->prepare("
        INSERT INTO activity_logs (user_role, action_type, description)
        VALUES (?, ?, ?)
    ");
    $role = "Admin";
    $action = "Archive Student";
    $stmtLog->bind_param("sss", $role, $action, $logDesc);
    $stmtLog->execute();

    $conn->commit();

    echo json_encode(["status" => "success", "message" => "Student archived successfully"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>