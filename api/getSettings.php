<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

try {
    $result = $conn->query("SELECT * FROM system_settings LIMIT 1");
    if ($result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        echo json_encode(["status" => "success", "data" => $settings]);
    } else {
        // Fallback if the table is empty
        echo json_encode(["status" => "success", "data" => ["current_year" => "2025-2026", "current_semester" => 1]]);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>