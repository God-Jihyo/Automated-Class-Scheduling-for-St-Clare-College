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
    // --- STEP 1: VERIFY SCHEDULES EXIST ---
    // Check if there are actually schedules for this room before moving
    $check = $conn->prepare("SELECT COUNT(*) as total FROM schedule WHERE room_id = ?");
    $check->bind_param("i", $id);
    $check->execute();
    $res = $check->get_result()->fetch_assoc();
    $scheduleCount = $res['total'];

    // --- STEP 2: MOVE TO ARCHIVE ---
    // Make sure column names match your DB EXACTLY
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

    // --- STEP 3: DELETE FROM MAIN ---
    $stmtDelSched = $conn->prepare("DELETE FROM schedule WHERE room_id = ?");
    $stmtDelSched->bind_param("i", $id);
    $stmtDelSched->execute();

    // --- STEP 4: ARCHIVE THE ROOM ---
    $stmtRoom = $conn->prepare("
        INSERT INTO rooms_archive (room_id, room_name, building, floor, room_type, archived_at)
        SELECT id, room_name, building, floor, room_type, NOW()
        FROM rooms WHERE id = ?
    ");
    $stmtRoom->bind_param("i", $id);
    $stmtRoom->execute();

    // --- STEP 5: DELETE ROOM ---
    $stmtDelRoom = $conn->prepare("DELETE FROM rooms WHERE id = ?");
    $stmtDelRoom->bind_param("i", $id);
    $stmtDelRoom->execute();

    $conn->commit();
    echo json_encode([
        "status" => "success", 
        "message" => "Archived room and $scheduleCount schedules."
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
}
?>