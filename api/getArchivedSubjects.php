<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

// This script does NOT need a subject_id because it gets ALL archived subjects
try {
    // We select from the archive table to show the user what's inside
    $query = "SELECT subject_id, code, subject_description, units, archived_at FROM subjects_archive ORDER BY archived_at DESC";
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