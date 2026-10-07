<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

$query = "SELECT * FROM sections ORDER BY section_name ASC";
$result = $conn->query($query);

$sections = [];
while ($row = $result->fetch_assoc()) {
    $sections[] = $row;
}

echo json_encode($sections);
?>