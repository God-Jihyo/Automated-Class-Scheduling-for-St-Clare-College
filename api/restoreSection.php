<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['section_id'] ?? $data['id'] ?? 0);

if (!$id) {
    echo json_encode(["status" => "error", "message" => "Missing Section ID"]);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Restore Section Details
    $stmtRes = $conn->prepare("INSERT INTO sections (section_id, section_name, course, year_level, default_room_id) SELECT section_id, section_name, course, year_level, default_room_id FROM sections_archive WHERE section_id = ?");
    $stmtRes->bind_param("i", $id);
    $stmtRes->execute();

    // 2. Restore Section-Subject Links (THE MISSING PIECE)
    $stmtResSS = $conn->prepare("INSERT INTO section_subjects (ss_id, section_id, subject_id) SELECT original_ss_id, section_id, subject_id FROM section_subjects_archive WHERE section_id = ?");
    $stmtResSS->bind_param("i", $id);
    $stmtResSS->execute();

    // 3. Restore Students (Using the name mapping logic from before)
    $stmtResStud = $conn->prepare("
        UPDATE students s
        INNER JOIN student_sections_archive ssa ON s.student_id = ssa.student_id
        INNER JOIN sections sect ON ssa.section_id = sect.section_id
        SET s.section = sect.section_name
        WHERE ssa.section_id = ?
    ");
    $stmtResStud->bind_param("i", $id);
    $stmtResStud->execute();

    // 4. Restore Schedules
    $stmtResSched = $conn->prepare("INSERT INTO schedule (schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code) SELECT original_schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code FROM schedule_archive WHERE section_id = ?");
    $stmtResSched->bind_param("i", $id);
    $stmtResSched->execute();

    // 5. Cleanup Archives
    $conn->query("DELETE FROM sections_archive WHERE section_id = $id");
    $conn->query("DELETE FROM section_subjects_archive WHERE section_id = $id");
    $conn->query("DELETE FROM student_sections_archive WHERE section_id = $id");
    $conn->query("DELETE FROM schedule_archive WHERE section_id = $id");

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Section, subjects, and students fully restored."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Restore failed: " . $e->getMessage()]);
}
?>