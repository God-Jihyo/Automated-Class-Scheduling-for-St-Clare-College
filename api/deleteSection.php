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
    // 0. Get the Section Name first (needed for the students table)
    $stmtName = $conn->prepare("SELECT section_name FROM sections WHERE section_id = ?");
    $stmtName->bind_param("i", $id);
    $stmtName->execute();
    $resName = $stmtName->get_result();
    $sectionRow = $resName->fetch_assoc();
    
    if (!$sectionRow) throw new Exception("Section not found in main table.");
    $sName = $sectionRow['section_name'];

    // 1. Archive Schedules (Uses ID)
    $stmtSched = $conn->prepare("INSERT INTO schedule_archive (original_schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code) SELECT schedule_id, section_id, subject_id, teacher_id, room_id, day_of_week, time_slot, is_locked, academic_year, semester, gmeet_link, classroom_code FROM schedule WHERE section_id = ?");
    $stmtSched->bind_param("i", $id);
    $stmtSched->execute();

    // Add this inside the try block of archiveSection.php, BEFORE the deletes:

    // 1.5 Archive Section-Subject relationships
    $stmtSS = $conn->prepare("INSERT INTO section_subjects_archive (original_ss_id, section_id, subject_id) SELECT ss_id, section_id, subject_id FROM section_subjects WHERE section_id = ?");
    $stmtSS->bind_param("i", $id);
    $stmtSS->execute();

    // Add this to the delete section at the bottom of the try block:
    $conn->query("DELETE FROM section_subjects WHERE section_id = $id");

    // 2. Archive Student links (Uses Section Name string)
    $stmtStudArchive = $conn->prepare("INSERT INTO student_sections_archive (student_id, section_id) SELECT student_id, ? FROM students WHERE section = ?");
    $stmtStudArchive->bind_param("is", $id, $sName); // Store ID in archive, but find by Name
    $stmtStudArchive->execute();

    // 3. Update Students (Clear the 'section' string column)
    $stmtClearStud = $conn->prepare("UPDATE students SET section = NULL WHERE section = ?");
    $stmtClearStud->bind_param("s", $sName);
    $stmtClearStud->execute();

    // 4. Archive Section Details
    $stmtSect = $conn->prepare("INSERT INTO sections_archive (section_id, section_name, course, year_level, default_room_id) SELECT section_id, section_name, course, year_level, default_room_id FROM sections WHERE section_id = ?");
    $stmtSect->bind_param("i", $id);
    $stmtSect->execute();

    // 5. Delete from main tables
    $conn->query("DELETE FROM schedule WHERE section_id = $id");
    $conn->query("DELETE FROM sections WHERE section_id = $id");

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Section archived successfully."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Archive Error: " . $e->getMessage()]);
}
?>