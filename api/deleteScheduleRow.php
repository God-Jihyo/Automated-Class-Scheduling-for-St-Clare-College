<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['schedule_id'] ?? 0;

if (!$id) {
    echo json_encode(["status" => "error", "message" => "Missing ID"]);
    exit;
}

$stmt = $conn->prepare("DELETE FROM schedule WHERE schedule_id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
   //LOGS
$logDesc = "Resolved Conflict: Deleted schedule entry #$id";
$conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Resolved Conflict', '$logDesc')");
//
    echo json_encode(["status" => "success", "message" => "Schedule entry removed. Conflict resolved."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to delete."]);
}
?>