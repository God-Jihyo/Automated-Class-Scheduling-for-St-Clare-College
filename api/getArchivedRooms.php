<?php
// getArchivedRooms.php
include '../config/db_connection.php';
header('Content-Type: application/json');

try {
    // We only need to SELECT the data to show it in the archive table
    $query = "SELECT room_id, room_name,department, capacity, room_type, archived_at as deleted_at FROM rooms_archive ORDER BY archived_at DESC";
    $result = $conn->query($query);

    $archived_rooms = [];
    while($row = $result->fetch_assoc()) {
        $archived_rooms[] = $row;
    }

    // This returns the ARRAY that your JS .forEach() is looking for
    echo json_encode($archived_rooms);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>