<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$section_id = isset($_GET['section_id']) ? (int)$_GET['section_id'] : 0;
if (!$section_id) { echo json_encode([]); exit; }

$sql = "
    SELECT 
        s.schedule_id,
        s.subject_id,
        s.teacher_id,
        sub.subject_description AS subject,
        t.full_name AS teacher_name,
        r.room_name,
        s.day_of_week,
        s.time_slot
    FROM schedule s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
    LEFT JOIN rooms r ON s.room_id = r.id
    WHERE s.section_id = ?
    ORDER BY s.time_slot, s.day_of_week
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i",$section_id);
$stmt->execute();
$res = $stmt->get_result();

// Added Saturday to the array mapping
$dayNames = [1=>'Monday', 2=>'Tuesday', 3=>'Wednesday', 4=>'Thursday', 5=>'Friday', 6=>'Saturday'];
$data = [];

while ($row = $res->fetch_assoc()){
    $d = (int)$row['day_of_week'];
    $row['day_of_week'] = $dayNames[$d] ?? $row['day_of_week'];
    if ($row['room_name'] === null) $row['room_name'] = 'Online';
    $data[] = $row;
}

echo json_encode($data);
?>