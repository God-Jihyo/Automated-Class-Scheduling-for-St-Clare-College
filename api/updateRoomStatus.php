<?php
// thesis/api/updateRoomStatus.php
require_once '../config/db_connection.php';

// ARCHITECTURAL RULE: Prevent JSON parse crashes
ob_start();
header("Content-Type: application/json");

$response = ["success" => false];

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $id = $data['id'] ?? null;
    $status = $data['status'] ?? null;
    
    if (!$id || !$status) {
        throw new Exception("Room ID and Status are required.");
    }
    
    // Smart detection: ensures it works whether your column is 'id' or 'room_id'
    $checkCol = $conn->query("SHOW COLUMNS FROM rooms LIKE 'room_id'");
    $idColName = ($checkCol->num_rows > 0) ? 'room_id' : 'id';
    
    // Update the status in the database
    $query = "UPDATE rooms SET status = ? WHERE $idColName = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ss", $status, $id);
    
    if ($stmt->execute()) {
        $response['success'] = true;
        $response['message'] = "Room status updated successfully.";
    } else {
        throw new Exception("Update failed: " . $stmt->error);
    }
    
    $stmt->close();
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

ob_clean();
echo json_encode($response);
$conn->close();
?>