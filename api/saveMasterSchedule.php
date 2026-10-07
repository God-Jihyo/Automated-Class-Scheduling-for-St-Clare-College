<?php
// thesis/api/saveMasterSchedule.php
header('Content-Type: application/json');
require_once '../config/db_connection.php';

// Read the JSON data sent from the drag-and-drop
$data = json_decode(file_get_contents('php://input'), true);

$subject_id = $data['subject_id'] ?? null;
$section_id = $data['section_id'] ?? null;
$room_id = $data['room_id'] ?? null;
$time = $data['time'] ?? null;
$days = $data['days'] ?? [];

if (!$subject_id || !$section_id || !$room_id || !$time || empty($days)) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

// Calculate End Time (Assuming a standard 1.5 hours / 90 mins for college blocks)
$end_time = date('H:i:s', strtotime($time) + 5400);

// Prepare the secure insert statement
$stmt = $conn->prepare("INSERT INTO schedule (section_id, subject_id, room_id, day, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)");

if (!$stmt) {
    echo json_encode(['success' => false, 'error' => 'Database prepare failed']);
    exit;
}

$successCount = 0;

// Loop through each selected day (e.g., Monday, Wednesday, Friday) and insert a row
foreach ($days as $day) {
    $stmt->bind_param("iiisss", $section_id, $subject_id, $room_id, $day, $time, $end_time);
    if ($stmt->execute()) {
        $successCount++;
    }
}

// Success!
echo json_encode(['success' => true, 'inserted_rows' => $successCount]);
?>