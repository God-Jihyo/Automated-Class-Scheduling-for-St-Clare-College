<?php
// thesis/api/getReservations.php
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$reservations = [];

// 1. Fetch from the OLD classic reservations table
$query1 = "SELECT rr.reservation_date, rr.event_name, rr.reserved_by, rr.start_time, rr.end_time, rr.status, r.room_name 
          FROM room_reservations rr 
          LEFT JOIN rooms r ON rr.room_id = r.id 
          WHERE rr.room_id > 0";
$res1 = $conn->query($query1);
if ($res1) {
    while ($row = $res1->fetch_assoc()) {
        $reservations[] = [
            'date' => $row['reservation_date'] ?: 'No Date',
            'eventName' => $row['event_name'] ?: 'Untitled',
            'organizer' => $row['reserved_by'] ?: 'Admin',
            'startTime' => $row['start_time'] ?: '',
            'endTime' => $row['end_time'] ?: '',
            'status' => $row['status'] ?: 'confirmed',
            'roomName' => $row['room_name'] ?: 'Unknown Room'
        ];
    }
}

// 2. Fetch from the NEW modern events table
// Match purely numeric locations OR locations starting with "Room ID:"
$query2 = "SELECT ce.start_date, ce.title, ce.start_time, ce.end_time, ce.status, ce.location 
           FROM campus_events ce 
           WHERE ce.location REGEXP '^[0-9]+$' OR ce.location LIKE 'Room ID: %'";
$res2 = $conn->query($query2);
if ($res2) {
    while ($row = $res2->fetch_assoc()) {
        $loc = $row['location'];
        $roomId = str_replace('Room ID: ', '', $loc);
        
        $roomName = 'Unknown Room';
        $rQuery = $conn->query("SELECT room_name FROM rooms WHERE id = '$roomId'");
        if ($rQuery && $rRow = $rQuery->fetch_assoc()) {
            $roomName = $rRow['room_name'];
        }

        $reservations[] = [
            'date' => $row['start_date'] ?: 'No Date',
            'eventName' => $row['title'] ?: 'Untitled Event',
            'organizer' => 'Admin (Modern Event)',
            'startTime' => $row['start_time'] ?: '',
            'endTime' => $row['end_time'] ?: '',
            'status' => $row['status'] ?: 'confirmed',
            'roomName' => $roomName
        ];
    }
}

// --- THE MAGIC FIX: Safe Sorting ---
usort($reservations, function($a, $b) {
    $timeA = strtotime($a['date'] . ' ' . $a['startTime']) ?: 0;
    $timeB = strtotime($b['date'] . ' ' . $b['startTime']) ?: 0;
    return $timeA <=> $timeB; 
});

echo json_encode([
    "success" => true,
    "data" => $reservations
]);
$conn->close();
?>