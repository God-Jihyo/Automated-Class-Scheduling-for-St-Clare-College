<?php
include '../config/db_connection.php';
header('Content-Type: application/json');

try {

    // Fetch archived students
    $stmt = $conn->prepare("
        SELECT 
            student_id,
            full_name,
            course,
            year_level,
            section,
            archived_at
        FROM students_archive
        ORDER BY archived_at DESC
    ");

    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];

    while ($row = $result->fetch_assoc()) {
        $data[] = [
            "student_id"   => $row['student_id'],
            "fullname"     => $row['full_name'], // match your JS
            "course_name"  => $row['course'],    // match your JS
            "year_level"   => $row['year_level'],
            "section"      => $row['section'],
            "deleted_at"   => $row['archived_at']
        ];
    }

    echo json_encode($data);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>