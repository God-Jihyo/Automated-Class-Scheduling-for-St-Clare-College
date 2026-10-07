<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require_once '../config/db_connection.php';

$details = [];
$sql = "SELECT s.schedule_id, s.section_id, s.teacher_id, s.room_id, s.day_of_week, s.time_slot, t.full_name as teacher_name, r.room_name, sec.section_name, sub.code as sub_code FROM schedule s LEFT JOIN teachers t ON s.teacher_id = t.teacher_id LEFT JOIN rooms r ON s.room_id = r.id LEFT JOIN sections sec ON s.section_id = sec.section_id LEFT JOIN subjects sub ON s.subject_id = sub.id";
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
                        $details[] = ["id" => $key, "type" => "Section Double Booked", "sec1_id" => $s1['section_id'], "sec1_name" => $s1['section_name'], "sec2_id" => $s2['section_id'], "sec2_name" => $s2['section_name'], "message" => "Section <b>{$s1['section_name']}</b> has a critical internal overlap. They are scheduled for both <b>{$s1['sub_code']}</b> and <b>{$s2['sub_code']}</b> simultaneously on <b>{$day}</b>: <br><span style='color:#c10d0d;'>{$s1['time_slot']}</span> vs <span style='color:#c10d0d;'>{$s2['time_slot']}</span>."];
                    }
                }
                if (!empty($s1['teacher_id']) && $s1['teacher_id'] == $s2['teacher_id']) {
                    $key = "T_" . min($s1['schedule_id'], $s2['schedule_id']) . "_" . max($s1['schedule_id'], $s2['schedule_id']);
                    if (!isset($conflict_keys[$key])) {
                        $conflict_keys[$key] = true;
                        $details[] = ["id" => $key, "type" => "Teacher Double Booked", "sec1_id" => $s1['section_id'], "sec1_name" => $s1['section_name'], "sec2_id" => $s2['section_id'], "sec2_name" => $s2['section_name'], "message" => "<b>{$s1['teacher_name']}</b> is scheduled to teach both <b>{$s1['sub_code']} ({$s1['section_name']})</b> and <b>{$s2['sub_code']} ({$s2['section_name']})</b> simultaneously on <b>{$day}</b>: <br><span style='color:#c10d0d;'>{$s1['time_slot']}</span> vs <span style='color:#c10d0d;'>{$s2['time_slot']}</span>."];
                    }
                }
                if (!empty($s1['room_id']) && $s1['room_id'] == $s2['room_id']) {
                    $key = "R_" . min($s1['schedule_id'], $s2['schedule_id']) . "_" . max($s1['schedule_id'], $s2['schedule_id']);
                    if (!isset($conflict_keys[$key])) {
                        $conflict_keys[$key] = true;
                        $details[] = ["id" => $key, "type" => "Room Double Booked", "sec1_id" => $s1['section_id'], "sec1_name" => $s1['section_name'], "sec2_id" => $s2['section_id'], "sec2_name" => $s2['section_name'], "message" => "Room <b>{$s1['room_name']}</b> is occupied by both <b>{$s1['section_name']}</b> and <b>{$s2['section_name']}</b> simultaneously on <b>{$day}</b>: <br><span style='color:#c10d0d;'>{$s1['time_slot']}</span> vs <span style='color:#c10d0d;'>{$s2['time_slot']}</span>."];
                    }
                }
            }
        }
    }
}

echo json_encode(["conflicts" => count($details), "details" => array_values($details)]);
?>