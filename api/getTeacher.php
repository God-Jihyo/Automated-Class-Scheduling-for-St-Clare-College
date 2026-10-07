<?php
include '../config/db_connection.php';
header("Content-Type: application/json");
error_reporting(0);

$teacher_id = $_GET['teacher_id'] ?? 0;

if (!$teacher_id) {
    echo json_encode(["status" => "error", "message" => "No teacher ID provided."]);
    exit;
}

// 🚨 ADDED LEFT JOIN to grab the profile picture!
$stmt = $conn->prepare("
    SELECT t.*, u.profile_picture 
    FROM teachers t 
    LEFT JOIN users u ON t.user_id = u.id OR u.username = t.teacher_id
    WHERE t.teacher_id = ? LIMIT 1
");
$stmt->bind_param("s", $teacher_id);
$stmt->execute();
$result = $stmt->get_result();
$teacher = $result->fetch_assoc();

if (!$teacher) {
    echo json_encode(["status" => "error", "message" => "Teacher not found."]);
    exit;
}

$stmt2 = $conn->prepare("SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?");
$stmt2->bind_param("i", $teacher_id);
$stmt2->execute();
$res2 = $stmt2->get_result();
$prefs = [];
while ($row = $res2->fetch_assoc()) {
    $prefs[] = $row['subject_id'];
}
$teacher['preferred_subjects'] = $prefs;

$setRes = $conn->query("SELECT * FROM system_settings LIMIT 1");
$settings = $setRes->fetch_assoc();
$active_year = $settings['current_year'] ?? '2025-2026';
$active_sem = (int)($settings['current_semester'] ?? 1);

// --- UPDATED SQL: Added LEFT JOIN rooms r ON s.room_id = r.id ---
$sched_sql = "
    SELECT 
        s.time_slot, 
        s.day_of_week, 
        sub.id AS subject_id, 
        sub.code, 
        sub.subject_description, 
        sec.section_name, 
        sec.year_level, 
        sec.course,
        r.room_name
    FROM schedule s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN sections sec ON s.section_id = sec.section_id
    LEFT JOIN rooms r ON s.room_id = r.id
    WHERE s.academic_year = '$active_year' AND s.semester = $active_sem AND s.teacher_id = $teacher_id
";

$sched_res = $conn->query($sched_sql);
$total_hours = 0;
$assigned_subjects = [];

if ($sched_res) {
    while($row = $sched_res->fetch_assoc()) {
        $times = explode('-', $row['time_slot']);
        $hours = 0;
        if (count($times) == 2) {
            $start = strtotime(trim($times[0]));
            $end = strtotime(trim($times[1]));
            if ($start && $end) {
                $hours = ($end - $start) / 3600;
            }
        }
        $total_hours += $hours;
        
        $sub_id = $row['subject_id'];
        if (!isset($assigned_subjects[$sub_id])) {
            $assigned_subjects[$sub_id] = [
                'subject_id' => $sub_id,
                'code' => $row['code'],
                'description' => $row['subject_description'],
                'total_hours' => 0,
                'classes' => []
            ];
        }
        
        $assigned_subjects[$sub_id]['total_hours'] += $hours;
        
        // --- UPDATED ARRAY: Added 'room' ---
        $assigned_subjects[$sub_id]['classes'][] = [
            'course' => $row['course'],
            'year_level' => $row['year_level'],
            'section_name' => $row['section_name'],
            'day' => $row['day_of_week'],
            'time_slot' => $row['time_slot'],
            'room' => $row['room_name'] ?? 'Online'
        ];
    }
}

$teacher['computed_hours'] = round($total_hours, 2);

foreach ($assigned_subjects as &$as) {
    $as['total_hours'] = round($as['total_hours'], 2);
}
$teacher['assigned_subjects'] = array_values($assigned_subjects);

echo json_encode($teacher);
?>