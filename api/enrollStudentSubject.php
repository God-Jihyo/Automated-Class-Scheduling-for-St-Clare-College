<?php
// thesis/api/enrollStudentSubject.php
require_once '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$student_id = trim($data['student_id'] ?? '');
$schedule_id = (int)($data['schedule_id'] ?? 0);

if(!$student_id || !$schedule_id) {
    echo json_encode(["success"=>false, "error"=>"Missing student or schedule ID."]);
    exit;
}

// THE ADVISER'S RULE: Check the 50-Seat Capacity
$capQ = $conn->query("SELECT COUNT(*) as c FROM student_enrollments WHERE schedule_id = $schedule_id");
$current = $capQ->fetch_assoc()['c'];

if($current >= 50) {
    echo json_encode(["success"=>false, "error"=>"Class is full! The maximum capacity of 50 students has been reached."]);
    exit;
}

// Check if they are already enrolled so they don't get double-booked
$chk = $conn->query("SELECT 1 FROM student_enrollments WHERE student_id = '$student_id' AND schedule_id = $schedule_id");
if($chk->num_rows > 0) {
    echo json_encode(["success"=>false, "error"=>"Student is already enrolled in this exact class!"]);
    exit;
}

// Give them the ticket!
$stmt = $conn->prepare("INSERT INTO student_enrollments (student_id, schedule_id) VALUES (?, ?)");
$stmt->bind_param("si", $student_id, $schedule_id);
if($stmt->execute()) {
    echo json_encode(["success"=>true, "message"=>"Successfully enrolled! Seat claimed. Current Enrolled: " . ($current + 1) . "/50"]);
} else {
    echo json_encode(["success"=>false, "error"=>$conn->error]);
}
?>