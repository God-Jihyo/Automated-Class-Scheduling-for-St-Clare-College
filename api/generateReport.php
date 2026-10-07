<?php
// thesis/api/generateReport.php
ob_clean(); 
error_reporting(E_ALL); 
ini_set('display_errors', 1);
require_once '../config/db_connection.php';

$type = strtolower(trim($_GET['type'] ?? ''));
if (!$type) die("Invalid export type.");

$filename = "SCC_Export_" . ucfirst($type) . "_" . date('Y-m-d_H-i-s') . ".csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); 

if ($type === 'schedules') {
    $course = $_GET['course'] ?? '';
    $year = $_GET['year'] ?? '';
    $section = $_GET['section'] ?? '';
    $teacher = $_GET['teacher'] ?? '';
    $room = $_GET['room'] ?? '';

    $courseMap = ['BSBA'=>'1', 'BSCS'=>'2', 'BSTM'=>'3', 'BSHM'=>'4', 'BEED'=>'5', 'BSED-ENG'=>'6', 'BSED-MATH'=>'7', 'POLSCI'=>'8'];
    $mappedCourse = $courseMap[strtoupper(trim($course))] ?? $course;

    preg_match('/\d+/', $year, $yearMatches);
    $cleanYear = $yearMatches[0] ?? $year;

    $secParts = explode('-', $section);
    $cleanSection = trim(end($secParts));

    fputcsv($output, ['Day', 'Time', 'Subject', 'Section', 'Teacher', 'Room']);
    
    $sql = "SELECT s.day_of_week, s.time_slot, 
                   sub.subject_description as subject_name, 
                   sub.code as subject_code, 
                   sec.section_name, 
                   sec.course as course_id,
                   t.full_name as teacher_name, 
                   r.room_name 
            FROM schedule s
            LEFT JOIN subjects sub ON s.subject_id = sub.id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE 1=1";

    if ($course) $sql .= " AND (sec.course = '" . $conn->real_escape_string($mappedCourse) . "' OR sec.course LIKE '%" . $conn->real_escape_string($course) . "%')";
    if ($year) $sql .= " AND sec.year_level = '" . $conn->real_escape_string($cleanYear) . "'";
    if ($section) $sql .= " AND sec.section_name LIKE '%" . $conn->real_escape_string($cleanSection) . "%'";
    if ($teacher) $sql .= " AND t.full_name LIKE '%" . $conn->real_escape_string($teacher) . "%'";
    if ($room) $sql .= " AND r.room_name LIKE '%" . $conn->real_escape_string($room) . "%'";
            
    $res = $conn->query($sql);
    $courseNames = [1 => "BSBA", 2 => "BSCS", 3 => "BSTM", 4 => "BSHM", 5 => "BEED", 6 => "BSED-ENG", 7 => "BSED-MATH", 8 => "POLSCI"];

    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $subj = !empty($row['subject_name']) ? $row['subject_name'] : $row['subject_code'];
            $cName = $courseNames[$row['course_id']] ?? $row['course_id'];
            $sectLabel = $cName . ' - ' . $row['section_name'];

            $rawRoom = $row['room_name'] ?? '';
            $finalRoom = (!empty($rawRoom) && strpos(strtoupper(trim($rawRoom)), 'TBA') === false) ? $rawRoom : 'Online'; 

            $rawTeacher = $row['teacher_name'] ?? '';
            $finalTeacher = empty($rawTeacher) ? 'TBA' : $rawTeacher;

            fputcsv($output, [$row['day_of_week'], $row['time_slot'], $subj, $sectLabel, $finalTeacher, $finalRoom]);
        }
    }
} else if ($type === 'teachers') {
    fputcsv($output, ['Teacher ID', 'Name', 'Department']);
    $res = $conn->query("SELECT teacher_id, full_name, department FROM teachers");
    if ($res) { while($row = $res->fetch_assoc()) fputcsv($output, $row); }

} else if ($type === 'rooms') {
    fputcsv($output, ['Room Name', 'Building', 'Capacity']);
    $res = $conn->query("SELECT room_name, building, capacity FROM rooms");
    if ($res) { while($row = $res->fetch_assoc()) fputcsv($output, $row); }

// ==========================================
// 🚨 SYSTEM ACTIVITY LOGS EXPORT
// ==========================================
} else if ($type === 'logs') {
    fputcsv($output, ['Log ID', 'User Role', 'Action Type', 'Description', 'Timestamp']);
    
    $sql = "SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 2000";
    $res = $conn->query($sql);
    
    if (!$res) {
        fputcsv($output, ['SQL ERROR CRASH:', $conn->error, '', '', '']);
    } else {
        if ($res->num_rows === 0) fputcsv($output, ['WARNING: ZERO LOGS FOUND IN DATABASE!', '', '', '', '']);
        while($row = $res->fetch_assoc()) {
            fputcsv($output, [
                $row['log_id'] ?? 'N/A',
                $row['user_role'] ?? 'N/A', 
                $row['action_type'] ?? 'N/A', 
                $row['description'] ?? 'N/A',
                $row['timestamp'] ?? 'N/A'
            ]);
        }
    }

// ==========================================
// 🚨 NEW LOGIC: SCHEDULE CONFLICTS EXPORT
// ==========================================
} else if ($type === 'conflicts') {
    fputcsv($output, ['Conflict Type', 'Section 1', 'Section 2', 'Issue Description']);

    $sql = "SELECT s.schedule_id, s.section_id, s.teacher_id, s.room_id, s.day_of_week, s.time_slot, 
                   t.full_name as teacher_name, r.room_name, sec.section_name, sub.code as sub_code 
            FROM schedule s 
            LEFT JOIN teachers t ON s.teacher_id = t.teacher_id 
            LEFT JOIN rooms r ON s.room_id = r.id 
            LEFT JOIN sections sec ON s.section_id = sec.section_id 
            LEFT JOIN subjects sub ON s.subject_id = sub.id";
            
    $res = $conn->query($sql);
    $schedules = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $day = trim($row['day_of_week']); 
            $schedules[$day][] = $row;
        }
    }

    $conflict_keys = []; 
    foreach ($schedules as $day => $day_scheds) {
        $count = count($day_scheds);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $s1 = $day_scheds[$i];
                $s2 = $day_scheds[$j];
                $t1 = explode('-', $s1['time_slot']);
                $t2 = explode('-', $s2['time_slot']);
                if (count($t1) !== 2 || count($t2) !== 2) continue;
                
                $start1 = strtotime("1970-01-01 " . trim($t1[0]));
                $end1   = strtotime("1970-01-01 " . trim($t1[1]));
                $start2 = strtotime("1970-01-01 " . trim($t2[0]));
                $end2   = strtotime("1970-01-01 " . trim($t2[1]));

                if ($start1 < $end2 && $start2 < $end1) {
                    if ($s1['section_id'] == $s2['section_id']) {
                        $key = "S_" . min($s1['schedule_id'], $s2['schedule_id']) . "_" . max($s1['schedule_id'], $s2['schedule_id']);
                        if (!isset($conflict_keys[$key])) {
                            $conflict_keys[$key] = true;
                            // Plain text formatting for Excel
                            $msg = "Section {$s1['section_name']} has a critical internal overlap. Scheduled for both {$s1['sub_code']} and {$s2['sub_code']} on {$day}: {$s1['time_slot']} vs {$s2['time_slot']}.";
                            fputcsv($output, ['Section Double Booked', $s1['section_name'], $s2['section_name'], $msg]);
                        }
                    }
                    if (!empty($s1['teacher_id']) && $s1['teacher_id'] == $s2['teacher_id']) {
                        $key = "T_" . min($s1['schedule_id'], $s2['schedule_id']) . "_" . max($s1['schedule_id'], $s2['schedule_id']);
                        if (!isset($conflict_keys[$key])) {
                            $conflict_keys[$key] = true;
                            $msg = "{$s1['teacher_name']} is scheduled to teach both {$s1['sub_code']} ({$s1['section_name']}) and {$s2['sub_code']} ({$s2['section_name']}) simultaneously on {$day}: {$s1['time_slot']} vs {$s2['time_slot']}.";
                            fputcsv($output, ['Teacher Double Booked', $s1['section_name'], $s2['section_name'], $msg]);
                        }
                    }
                    if (!empty($s1['room_id']) && $s1['room_id'] == $s2['room_id']) {
                        $key = "R_" . min($s1['schedule_id'], $s2['schedule_id']) . "_" . max($s1['schedule_id'], $s2['schedule_id']);
                        if (!isset($conflict_keys[$key])) {
                            $conflict_keys[$key] = true;
                            $msg = "Room {$s1['room_name']} is occupied by both {$s1['section_name']} and {$s2['section_name']} simultaneously on {$day}: {$s1['time_slot']} vs {$s2['time_slot']}.";
                            fputcsv($output, ['Room Double Booked', $s1['section_name'], $s2['section_name'], $msg]);
                        }
                    }
                }
            }
        }
    }
    
    // Fallback if there are no conflicts
    if (count($conflict_keys) === 0) {
        fputcsv($output, ['No conflicts detected!', '', '', 'All schedules are perfectly aligned.']);
    }

} else {
    fputcsv($output, ['CRITICAL ERROR: PHP did not recognize the type you sent.']);
    fputcsv($output, ['The type received was:', $type]);
}

fclose($output);
exit;
?>