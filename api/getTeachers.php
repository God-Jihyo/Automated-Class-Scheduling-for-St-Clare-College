<?php
// api/getTeachers.php
include '../config/db_connection.php';
header('Content-Type: application/json');

// --- 1. GET ACTIVE TERM ---
$setRes = $conn->query("SELECT * FROM system_settings LIMIT 1");
$settings = $setRes->fetch_assoc();
$active_year = $settings['current_year'] ?? '2025-2026';
$active_sem = (int)($settings['current_semester'] ?? 1);

$q = isset($_GET['q']) ? $_GET['q'] : '';
$department = isset($_GET['department']) ? $_GET['department'] : '';

$sql = "SELECT teacher_id, full_name, department, teaching_load FROM teachers WHERE 1=1";
$params = [];
$types = "";

if ($department !== "") {
    $sql .= " AND department = ?";
    $params[] = $department;
    $types .= "s";
}

if ($q !== "") {
    $sql .= " AND (full_name LIKE ? OR teacher_id LIKE ?)";
    $search_term = "%{$q}%";
    $params[] = $search_term;
    $params[] = $search_term;
    $types .= "ss";
}

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$res = $stmt->get_result();
$teachers = $res->fetch_all(MYSQLI_ASSOC);

// --- 2. CALCULATE COMPUTED HOURS FROM SCHEDULE TABLE ---
$sched_sql = "SELECT teacher_id, time_slot FROM schedule WHERE academic_year = '$active_year' AND semester = $active_sem AND teacher_id IS NOT NULL";
$sched_res = $conn->query($sched_sql);

$teacher_hours = [];
if ($sched_res) {
    while($row = $sched_res->fetch_assoc()) {
        $tid = $row['teacher_id'];
        $times = explode('-', $row['time_slot']);
        if (count($times) == 2) {
            $start = strtotime(trim($times[0]));
            $end = strtotime(trim($times[1]));
            if ($start && $end) {
                // Calculate difference in hours
                $hours = ($end - $start) / 3600;
                if (!isset($teacher_hours[$tid])) $teacher_hours[$tid] = 0;
                $teacher_hours[$tid] += $hours;
            }
        }
    }
}

// --- 3. MERGE DATA ---
foreach ($teachers as &$t) {
    $tid = $t['teacher_id'];
    // Assign computed hours (default to 0 if they have no classes)
    $t['computed_hours'] = isset($teacher_hours[$tid]) ? round($teacher_hours[$tid], 2) : 0;
}

echo json_encode($teachers);
?>