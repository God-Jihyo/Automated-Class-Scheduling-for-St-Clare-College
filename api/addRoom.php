<?php
require_once '../config/db_connection.php';
ob_start();
header("Content-Type: application/json");
$response = ["success" => false];

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $room_name = $data["name"] ?? "";
    $building = $data["building"] ?? "Main Building";
    $floor = $data["floor"] ?? 1;
    $capacity = $data["capacity"] ?? 30;
    $room_type = $data["type"] ?? "lecture";
    $department = $data["department"] ?? "SHARED"; 

    if ($room_name === "") throw new Exception("Missing required fields.");

    $query = "INSERT INTO rooms (room_name, building, floor, capacity, room_type, status, department) VALUES (?, ?, ?, ?, ?, 'available', ?)";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ssiiss", $room_name, $building, $floor, $capacity, $room_type, $department);
    
    if ($stmt->execute()) {
        $response["success"] = true;
        $response["status"] = "success";
    } else {
        throw new Exception("Failed to add room: " . $stmt->error);
    }
} catch (Exception $e) {
    $response["error"] = $e->getMessage();
}
ob_clean();
echo json_encode($response);
?>