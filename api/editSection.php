<?php
// thesis/api/editSection.php
require_once '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;
$name = $data['name'] ?? '';
$course = $data['course'] ?? '';
$year = $data['year'] ?? '';
$room = !empty($data['room']) ? $data['room'] : null;

if(!$id || !$name) { 
    echo json_encode(['success'=>false, 'error'=>'Missing required data']); 
    exit; 
}

$room_val = $room ? (int)$room : "NULL";

$stmt = $conn->prepare("UPDATE sections SET section_name=?, course=?, year_level=?, default_room_id=? WHERE section_id=?");
$stmt->bind_param("ssiii", $name, $course, $year, $room, $id);

if($stmt->execute()) {
    echo json_encode(['success'=>true]);
} else {
    echo json_encode(['success'=>false, 'error'=>$conn->error]);
}
?>