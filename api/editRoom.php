<?php
require_once '../config/db_connection.php';
ob_start();
header("Content-Type: application/json");
$response = ["success" => false];

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $id = $data['id'] ?? null;
    if (!$id) throw new Exception("Room ID is missing.");
    
    $name = $data['name'] ?? 'Unknown';
    $building = $data['building'] ?? 'Main Building';
    $floor = $data['floor'] ?? 1;
    $capacity = $data['capacity'] ?? 30;
    $type = $data['type'] ?? 'lecture';
    $department = $data['department'] ?? 'SHARED'; 
    
    $checkCol = $conn->query("SHOW COLUMNS FROM rooms LIKE 'room_id'");
    $idColName = ($checkCol->num_rows > 0) ? 'room_id' : 'id';
    
    $query = "UPDATE rooms SET room_name = ?, building = ?, floor = ?, capacity = ?, room_type = ?, department = ? WHERE $idColName = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ssiissi", $name, $building, $floor, $capacity, $type, $department, $id);
    
    if ($stmt->execute()) {
        $response["success"] = true;
        $response["status"] = "success";
    } else {
        throw new Exception("Update failed: " . $stmt->error);
    }
} catch (Exception $e) {
    $response["error"] = $e->getMessage();
}
ob_clean();
echo json_encode($response);
?>