<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['subject_id'] ?? $data['id'] ?? 0);

if (!$id) {
    echo json_encode(["status" => "error", "message" => "Missing Subject ID"]);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Archive Section-Subject mappings
    $stmtSS = $conn->prepare("INSERT INTO section_subjects_archive (original_ss_id, section_id, subject_id) SELECT ss_id, section_id, subject_id FROM section_subjects WHERE subject_id = ?");
    $stmtSS->bind_param("i", $id);
    $stmtSS->execute();

    // 2. Archive Course-Subject mappings
    $stmtCS = $conn->prepare("INSERT INTO course_subjects_archive (original_cs_id, course_id, subject_id, year_level, semester) SELECT id, course_id, subject_id, year_level, semester FROM course_subjects WHERE subject_id = ?");
    $stmtCS->bind_param("i", $id);
    $stmtCS->execute();

    // 3. Archive Teacher-Subject assignments
    $stmtTS = $conn->prepare("INSERT INTO teacher_subjects_archive (original_ts_id, teacher_id, subject_id) SELECT ts_id, teacher_id, subject_id FROM teacher_subjects WHERE subject_id = ?");
    $stmtTS->bind_param("i", $id);
    $stmtTS->execute();

    // 4. Archive Schedules
    $stmtSched = $conn->prepare("INSERT INTO schedule_archive (original_schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code) SELECT schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code FROM schedule WHERE subject_id = ?");
    $stmtSched->bind_param("i", $id);
    $stmtSched->execute();

    // 5. Archive Subject Details
    $stmtSub = $conn->prepare("INSERT INTO subjects_archive (subject_id, code, subject_description, units, hours_per_week, delivery_mode, semester) SELECT id, code, subject_description, units, hours_per_week, delivery_mode, semester FROM subjects WHERE id = ?");
    $stmtSub->bind_param("i", $id);
    $stmtSub->execute();

    // 6. DELETE FROM MAIN TABLES (Dependencies first)
    $conn->query("DELETE FROM schedule WHERE subject_id = $id");
    $conn->query("DELETE FROM section_subjects WHERE subject_id = $id");
    $conn->query("DELETE FROM teacher_subjects WHERE subject_id = $id");
    $conn->query("DELETE FROM course_subjects WHERE subject_id = $id");
    $conn->query("DELETE FROM subjects WHERE id = $id");

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Subject and all assignments archived."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>