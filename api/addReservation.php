<?php
// thesis/api/addReservation.php
require_once '../config/db_connection.php';

// ARCHITECTURAL RULE: Prevent JSON parse crashes
ob_start();
header("Content-Type: application/json");

$response = ["success" => false];

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $room_id = $data['room_id'] ?? null;
    $event_name = $data['event_name'] ?? null;
    $reserved_by = $data['reserved_by'] ?? 'Admin';
    $res_date = $data['date'] ?? null;
    $start_time = $data['start_time'] ?? null;
    $end_time = $data['end_time'] ?? null;

    if (!$room_id || !$event_name || !$res_date || !$start_time || !$end_time) {
        throw new Exception("Missing required fields.");
    }

    // Insert into the room_reservations table we created earlier
    $query = "INSERT INTO room_reservations (room_id, event_name, reserved_by, reservation_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("isssss", $room_id, $event_name, $reserved_by, $res_date, $start_time, $end_time);

    if ($stmt->execute()) {
        // Safe Activity Logging
        $logDesc = "Added Facility Reservation: $event_name on $res_date";
        $logQuery = "INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Added Reservation', ?)";
        $logStmt = $conn->prepare($logQuery);
        $logStmt->bind_param("s", $logDesc);
        $logStmt->execute();

        $response['success'] = true;
        $response['message'] = "Reservation added successfully.";
    } else {
        throw new Exception("Database error: " . $stmt->error);
    }
    
    $stmt->close();
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

// ARCHITECTURAL RULE: Clean output
ob_clean();
echo json_encode($response);
$conn->close();
?>