<?php
include '../config/db_connection.php';
header("Content-Type: application/json");


$sql = "SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 1000";
$result = $conn->query($sql);

$logs = [];
while ($row = $result->fetch_assoc()) {
    // Format date nicely
    $row['formatted_date'] = date("M d, Y h:i A", strtotime($row['timestamp']));
    $logs[] = $row;
}

echo json_encode($logs);
?>