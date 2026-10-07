<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$res = $conn->query("SELECT * FROM time_slots ORDER BY day_of_week, start_time");

$slots = [];
while ($row = $res->fetch_assoc()) $slots[] = $row;

echo json_encode($slots);
