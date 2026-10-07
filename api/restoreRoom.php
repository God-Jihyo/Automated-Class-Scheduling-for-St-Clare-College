<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['id'] ?? 0);

if (!$id) {
    echo json_encode(["status" => "error", "message" => "Missing Room ID"]);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Restore Room with original ID
    $stmtRoom = $conn->prepare("
        INSERT INTO rooms (id, room_name, department, capacity, building, floor, room_type, status)
        SELECT room_id, room_name, department, capacity, building, floor, room_type, 'available'
        FROM rooms_archive WHERE room_id = ?
    ");
    $stmtRoom->bind_param("i", $id);
    $stmtRoom->execute();

    // 2. Restore Schedules - FORCING the original ID back
    $stmtRestoreSched = $conn->prepare("
        INSERT INTO schedule (
            schedule_id, section_id, subject_id, teacher_id, room_id, 
            day_of_week, time_slot, is_locked, 
            academic_year, semester, gmeet_link, classroom_code
        )
        SELECT 
            original_schedule_id, section_id, subject_id, teacher_id, room_id, 
            day_of_week, time_slot, is_locked, 
            academic_year, semester, gmeet_link, classroom_code 
        FROM schedule_archive WHERE room_id = ?
    ");
    $stmtRestoreSched->bind_param("i", $id);
    $stmtRestoreSched->execute();
    $count = $stmtRestoreSched->affected_rows;

    // 3. Cleanup Archive tables
    $conn->query("DELETE FROM rooms_archive WHERE room_id = $id");
    $conn->query("DELETE FROM schedule_archive WHERE room_id = $id");

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Room and $count schedules restored with original IDs."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Restore failed: " . $e->getMessage()]);
}
?>