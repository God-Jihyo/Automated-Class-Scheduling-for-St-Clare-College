<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

try {
    $result = $conn->query("SELECT teacher_id, full_name, email, department, position, archived_at FROM teachers_archive ORDER BY archived_at DESC");
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = [
            "teacher_id" => $row['teacher_id'],
            "fullname"   => $row['full_name'],
            "email"      => $row['email'],
            "dept"       => $row['department'],
            "pos"        => $row['position'],
            "deleted_at" => $row['archived_at']
        ];
    }
    echo json_encode($data);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>