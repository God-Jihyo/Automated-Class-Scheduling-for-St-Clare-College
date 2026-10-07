<?php
// thesis/api/getAvailableSchedules.php
require_once '../config/db_connection.php';
header("Content-Type: application/json");

// 1. Fetch all schedule slots and count their enrollments
$query = "SELECT s.schedule_id, s.section_id, s.subject_id, s.day_of_week, s.time_slot,
                 sub.code as subject_code, sec.section_name, sec.course, sec.year_level,
                 (SELECT COUNT(*) FROM student_enrollments se WHERE se.schedule_id = s.schedule_id) as enrolled_count
          FROM schedule s
          JOIN subjects sub ON s.subject_id = sub.id
          JOIN sections sec ON s.section_id = sec.section_id
          ORDER BY sec.course, sec.year_level, sec.section_name, sub.code";

$res = $conn->query($query);
$groupedSchedules = [];

if($res) {
    while($row = $res->fetch_assoc()) {
        // Create a unique key for the Class (Section + Subject)
        $classKey = $row['section_id'] . '_' . $row['subject_id'];
        
        // Use the FIRST schedule_id we find as the main ID for this class
        $mainScheduleId = $row['schedule_id'];

        if (!isset($groupedSchedules[$classKey])) {
            $groupedSchedules[$classKey] = [
                'schedule_id' => $mainScheduleId, // We use this to enroll them
                'course' => $row['course'],
                'year_level' => $row['year_level'],
                'section_name' => $row['section_name'],
                'subject_code' => $row['subject_code'],
                'time_slot' => $row['time_slot'],
                'days' => [], // We will collect the days here
                'enrolled_count' => $row['enrolled_count']
            ];
        }
        
        // Add the day to our collection (e.g., "Monday")
        if (!in_array($row['day_of_week'], $groupedSchedules[$classKey]['days'])) {
            $groupedSchedules[$classKey]['days'][] = $row['day_of_week'];
        }
    }
}

// 2. Format the output so it looks clean!
$finalList = [];
foreach ($groupedSchedules as $class) {
    // Convert ["Monday", "Wednesday", "Friday"] into "MWF"
    $dayMap = ['Monday'=>'M', 'Tuesday'=>'T', 'Wednesday'=>'W', 'Thursday'=>'Th', 'Friday'=>'F', 'Saturday'=>'S'];
    $shortDays = array_map(function($d) use ($dayMap) { return $dayMap[$d] ?? $d; }, $class['days']);
    $dayString = implode('', $shortDays); // Becomes "MWF"

    $finalList[] = [
        'schedule_id' => $class['schedule_id'],
        'course' => $class['course'],
        'year_level' => $class['year_level'],
        'section_name' => $class['section_name'],
        'subject_code' => $class['subject_code'],
        'day_of_week' => $dayString,
        'time_slot' => $class['time_slot'],
        'enrolled_count' => $class['enrolled_count']
    ];
}

echo json_encode(["success" => true, "data" => array_values($finalList)]);
?>