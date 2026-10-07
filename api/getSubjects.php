<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

if (!isset($_GET['course_id']) || !isset($_GET['year_level'])) {
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit();
}

$course_id = intval($_GET['course_id']);
$year_level = intval($_GET['year_level']);
// Catch the active semester! Defaults to 1 if not provided.
$semester = isset($_GET['semester']) ? intval($_GET['semester']) : 1; 

$stmt = $conn->prepare("
    SELECT 
        subjects.id AS subject_id,
        subjects.code,
        subjects.subject_description,
        course_subjects.semester
    FROM course_subjects
    JOIN subjects ON course_subjects.subject_id = subjects.id
    WHERE course_subjects.course_id = ?
      AND course_subjects.year_level = ?
      AND course_subjects.semester = ?
");

// Bind the 3 parameters (course, year, semester)
$stmt->bind_param("iii", $course_id, $year_level, $semester);
$stmt->execute();

$result = $stmt->get_result();
$subjects = [];

while ($row = $result->fetch_assoc()) {
    $subjects[] = $row;
}

echo json_encode($subjects);
?>