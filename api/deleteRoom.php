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
    // 1. Capture count for message
    $check = $conn->prepare("SELECT COUNT(*) FROM schedule WHERE room_id = ?");
    $check->bind_param("i", $id);
    $check->execute();
    $check->bind_result($schedCount);
    $check->fetch();
    $check->close();

    // 2. Archive Schedules - Mapping schedule_id to original_schedule_id
    $stmtSched = $conn->prepare("
        INSERT INTO schedule_archive (
            original_schedule_id, section_id, subject_id, teacher_id, 
            room_id, day_of_week, time_slot, is_locked, 
            academic_year, semester, gmeet_link, classroom_code
        )
        SELECT 
            schedule_id, section_id, subject_id, teacher_id, 
            room_id, day_of_week, time_slot, is_locked, 
            academic_year, semester, gmeet_link, classroom_code 
        FROM schedule WHERE room_id = ?
    ");
    $stmtSched->bind_param("i", $id);
    $stmtSched->execute();

    // 3. Delete from main schedule
    $stmtDelSched = $conn->prepare("DELETE FROM schedule WHERE room_id = ?");
    $stmtDelSched->bind_param("i", $id);
    $stmtDelSched->execute();

    // 4. Archive Room
    $stmtRoom = $conn->prepare("
        INSERT INTO rooms_archive (room_id, room_name, department, capacity, building, floor, room_type)
        SELECT id, room_name, department, capacity, building, floor, room_type 
        FROM rooms WHERE id = ?
    ");
    $stmtRoom->bind_param("i", $id);
    $stmtRoom->execute();

    // 5. Delete Room
    $stmtDelRoom = $conn->prepare("DELETE FROM rooms WHERE id = ?");
    $stmtDelRoom->bind_param("i", $id);
    $stmtDelRoom->execute();

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Archived room and $schedCount schedules."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>