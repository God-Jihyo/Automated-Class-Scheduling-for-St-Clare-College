<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

try {
    $data = json_decode(file_get_contents("php://input"), true);
    $year = $data['current_year'] ?? '';
    $semester = intval($data['current_semester'] ?? 1);

    if (!$year || !$semester) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE system_settings SET current_year=?, current_semester=? WHERE id=1");
    $stmt->bind_param("si", $year, $semester);
    
    if ($stmt->execute()) {
        $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'System Update', 'Changed Active Term to $year, Semester $semester')");
        echo json_encode(["status" => "success", "message" => "Active term updated successfully!"]);
    } else {
        echo json_encode(["status" => "error", "message" => $stmt->error]);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>