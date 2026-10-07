<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$course_id = intval($_GET['course_id'] ?? 0);
$year_level = intval($_GET['year_level'] ?? 0);

if (!$course_id || !$year_level) {
    echo json_encode(["count" => 0]);
    exit;
}

// Count existing FTF subjects for this Course + Year
$sql = "
    SELECT COUNT(*) as total
    FROM course_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.course_id = ? 
      AND cs.year_level = ? 
      AND s.delivery_mode = 'ftf'
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $course_id, $year_level);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();

echo json_encode(["count" => intval($row['total'])]);
?>