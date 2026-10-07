<?php
// thesis/api/publishSchedule.php (STABLE ROLLBACK)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start(); // Trap HTML errors

header('Content-Type: application/json');

try {
    require_once '../config/db_connection.php';
    
    $rawData = file_get_contents("php://input");
    $data = json_decode($rawData, true);

    if (!isset($data['section_id']) || !isset($data['schedules'])) {
        throw new Exception("Missing data payload.");
    }

    $section_id = (int)$data['section_id'];
    $schedules = $data['schedules'];

    $conn->begin_transaction();
    $conn->query("DELETE FROM schedule WHERE section_id = $section_id");

    $inserted = 0;
    foreach ($schedules as $sched) {
        $day = $conn->real_escape_string($sched['day'] ?? 'Monday');
        $room_name = $conn->real_escape_string($sched['room_name'] ?? '');
        $raw_time = $sched['time_slot'] ?? '';
        $subject_code_raw = $sched['subject_code'] ?? '';
        
        $t_parts = explode('-', $raw_time);
        if (count($t_parts) == 2) {
            $start_time = date("H:i:s", strtotime(trim($t_parts[0])));
            $end_time   = date("H:i:s", strtotime(trim($t_parts[1])));
            $time_slot = $start_time . "-" . $end_time; 
        } else {
            $time_slot = $conn->real_escape_string($raw_time);
        }
        
        $teacher_id = !empty($sched['teacher_id']) ? (int)$sched['teacher_id'] : "NULL";

        $subject_id = 0;
        if (!empty($sched['subject_id'])) {
            $subject_id = (int)$sched['subject_id'];
        } else if (!empty($subject_code_raw)) {
            $code = $conn->real_escape_string($subject_code_raw);
            $sub_res = $conn->query("SELECT id FROM subjects WHERE code = '$code' LIMIT 1");
            if ($sub_res && $sub_res->num_rows > 0) $subject_id = $sub_res->fetch_assoc()['id'];
        }
        
        if ($subject_id === 0) continue; 

        $room_id = "NULL";
        if (!empty($room_name) && $room_name !== 'Online' && $room_name !== 'TBA') {
            $room_res = $conn->query("SELECT id FROM rooms WHERE room_name = '$room_name' LIMIT 1");
            if ($room_res && $room_res->num_rows > 0) $room_id = $room_res->fetch_assoc()['id'];
        }

        $conn->query("INSERT INTO schedule (section_id, subject_id, teacher_id, room_id, day_of_week, time_slot) VALUES ($section_id, $subject_id, $teacher_id, $room_id, '$day', '$time_slot')");
        $inserted++;
    }

    $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('admin', 'PUBLISH_SCHEDULE', 'Published schedule for section ID $section_id')");
    $conn->commit();
    
    ob_end_clean();
    echo json_encode(['status' => 'success', 'message' => "Successfully published ($inserted classes)!"]);

} catch (\Throwable $e) {
    if (isset($conn) && $conn->ping()) $conn->rollback();
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Publish Failed: ' . $e->getMessage()]);
}
?>