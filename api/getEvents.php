<?php
// thesis/api/getEvents.php
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$query = "SELECT * FROM events";
$result = $conn->query($query);

$events = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $events[] = [
            'id' => isset($row['id']) ? (string)$row['id'] : uniqid(),
            'title' => !empty($row['title']) ? $row['title'] : (!empty($row['event_title']) ? $row['event_title'] : 'Untitled Event'),
            'description' => !empty($row['description']) ? $row['description'] : '',
            'type' => !empty($row['type']) ? strtolower($row['type']) : 'academic',
            'status' => !empty($row['status']) ? strtolower($row['status']) : 'upcoming',
            'startDate' => $row['startDate'] ?? $row['start_date'] ?? $row['event_date'] ?? date('Y-m-d'),
            'endDate' => $row['endDate'] ?? $row['end_date'] ?? date('Y-m-d'),
            'startTime' => $row['startTime'] ?? $row['start_time'] ?? '08:00',
            'endTime' => $row['endTime'] ?? $row['end_time'] ?? '17:00',
            'location' => $row['location'] ?? '',
            'isHighlighted' => true
        ];
    }
}

echo json_encode($events);
$conn->close();
?>