<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

try {
    // Select the details from the archive table
    $query = "SELECT section_id, section_name, course, year_level, archived_at FROM sections_archive ORDER BY archived_at DESC";
    $result = $conn->query($query);
    
    $archived = [];
    while($row = $result->fetch_assoc()) {
        $archived[] = $row;
    }
    
    echo json_encode(["status" => "success", "data" => $archived]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>