<?php
// api/get_carousel_posters.php

require_once '../config/db_connection.php';
header('Content-Type: application/json');

// Fetch the 3 most recent approved reservations/announcements
$sql = "SELECT event_name, description, poster_url FROM room_reservations WHERE status = 'approved' ORDER BY reservation_date DESC LIMIT 3";
$result = $conn->query($sql);

$posters = [];
// We use a red-dominant palette for default backgrounds if no image is uploaded
$fallback_colors = ['#B31B1B', '#1e293b', '#8A1515']; 

if ($result && $result->num_rows > 0) {
    $i = 0;
    while ($row = $result->fetch_assoc()) {
        $color = $fallback_colors[$i % 3];
        $posters[] = [
            'title' => $row['event_name'],
            'subtitle' => $row['description'] ? $row['description'] : 'Upcoming Event',
            'image' => $row['poster_url'],
            'color' => $color
        ];
        $i++;
    }
}

// If the database is completely empty, show these default theme posters
if (count($posters) === 0) {
    $posters[] = ['title' => 'Welcome to the SCC Portal', 'subtitle' => 'Your academic journey starts here', 'image' => null, 'color' => '#B31B1B'];
    $posters[] = ['title' => 'Check Your Schedules', 'subtitle' => 'Stay updated with your classes', 'image' => null, 'color' => '#1e293b'];
}

echo json_encode([
    'success' => true,
    'posters' => $posters
]);

$conn->close();
?>