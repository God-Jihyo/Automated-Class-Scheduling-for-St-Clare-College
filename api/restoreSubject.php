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
    // 1. Restore Subject
    $stmtResSub = $conn->prepare("INSERT INTO subjects (id, code, subject_description, units, hours_per_week, delivery_mode, semester) SELECT subject_id, code, subject_description, units, hours_per_week, delivery_mode, semester FROM subjects_archive WHERE subject_id = ?");
    $stmtResSub->bind_param("i", $id);
    $stmtResSub->execute();

    // 2. Restore Section-Subject Mappings (Forcing original ss_id)
    $stmtResSS = $conn->prepare("INSERT INTO section_subjects (ss_id, section_id, subject_id) SELECT original_ss_id, section_id, subject_id FROM section_subjects_archive WHERE subject_id = ?");
    $stmtResSS->bind_param("i", $id);
    $stmtResSS->execute();

    // 3. Restore Course-Subject Mappings
    $stmtResCS = $conn->prepare("INSERT INTO course_subjects (id, course_id, subject_id, year_level, semester) SELECT original_cs_id, course_id, subject_id, year_level, semester FROM course_subjects_archive WHERE subject_id = ?");
    $stmtResCS->bind_param("i", $id);
    $stmtResCS->execute();

    // 4. Restore Teacher-Subject links
    $stmtResTS = $conn->prepare("INSERT INTO teacher_subjects (ts_id, teacher_id, subject_id) SELECT original_ts_id, teacher_id, subject_id FROM teacher_subjects_archive WHERE subject_id = ?");
    $stmtResTS->bind_param("i", $id);
    $stmtResTS->execute();

    // 5. Restore Schedules
    $stmtResSched = $conn->prepare("INSERT INTO schedule (schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code) SELECT original_schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code FROM schedule_archive WHERE subject_id = ?");
    $stmtResSched->bind_param("i", $id);
    $stmtResSched->execute();

    // 6. Cleanup
    $conn->query("DELETE FROM subjects_archive WHERE subject_id = $id");
    $conn->query("DELETE FROM section_subjects_archive WHERE subject_id = $id");
    $conn->query("DELETE FROM course_subjects_archive WHERE subject_id = $id");
    $conn->query("DELETE FROM teacher_subjects_archive WHERE subject_id = $id");
    $conn->query("DELETE FROM schedule_archive WHERE subject_id = $id");

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Subject fully restored with all section links."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>