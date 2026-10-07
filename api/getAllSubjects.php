<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$semester = isset($_GET['semester']) ? intval($_GET['semester']) : 1;

// Fetch Subject Details, filtered securely by the active semester
$sql = "
    SELECT 
        s.id, 
        s.code, 
        s.subject_description,
        GROUP_CONCAT(DISTINCT cs.course_id) as course_ids,
        GROUP_CONCAT(DISTINCT cs.year_level) as year_levels,
        GROUP_CONCAT(DISTINCT cs.semester) as semesters
    FROM subjects s
    JOIN course_subjects cs ON s.id = cs.subject_id
    WHERE cs.semester = ?
    GROUP BY s.id
    ORDER BY s.subject_description ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $semester);
$stmt->execute();
$result = $stmt->get_result();

$subs = [];
while ($row = $result->fetch_assoc()) {
    $subs[] = $row;
}
echo json_encode($subs);
?>