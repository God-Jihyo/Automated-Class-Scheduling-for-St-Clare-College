<?php
// thesis/api/getSchedulePreview.php
error_reporting(0); ini_set('display_errors', 0); header('Content-Type: application/json'); ob_start();

try {
    require_once '../config/db_connection.php';
    
    $course = $_GET['course'] ?? ''; 
    $year = $_GET['year'] ?? ''; 
    $section = $_GET['section'] ?? ''; 
    $teacher = $_GET['teacher'] ?? ''; 
    $room = $_GET['room'] ?? '';

    // 🚨 SMART TRANSLATOR: Maps text to Database IDs
    $courseMap = ['BSBA'=>'1', 'BSCS'=>'2', 'BSTM'=>'3', 'BSHM'=>'4', 'BEED'=>'5', 'BSED-ENG'=>'6', 'BSED-MATH'=>'7', 'POLSCI'=>'8'];
    $mappedCourse = $courseMap[strtoupper(trim($course))] ?? $course;

    // Cleans "1st Year" -> "1"
    preg_match('/\d+/', $year, $yearMatches);
    $cleanYear = $yearMatches[0] ?? $year;

    // Cleans "BSCS - 1A" -> "1A"
    $secParts = explode('-', $section);
    $cleanSection = trim(end($secParts));

    // Core SQL using your exact Database Schema
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

    // Apply the clean filters!
    if ($course) $sql .= " AND (sec.course = '" . $conn->real_escape_string($mappedCourse) . "' OR sec.course LIKE '%" . $conn->real_escape_string($course) . "%')";
    if ($year) $sql .= " AND sec.year_level = '" . $conn->real_escape_string($cleanYear) . "'";
    if ($section) $sql .= " AND sec.section_name LIKE '%" . $conn->real_escape_string($cleanSection) . "%'";
    if ($teacher) $sql .= " AND t.full_name LIKE '%" . $conn->real_escape_string($teacher) . "%'";
    if ($room) $sql .= " AND r.room_name LIKE '%" . $conn->real_escape_string($room) . "%'";

    $res = $conn->query($sql);
    if (!$res) throw new Exception("SQL Error: " . $conn->error);

    $data = [];
    $courseNames = [1 => "BSBA", 2 => "BSCS", 3 => "BSTM", 4 => "BSHM", 5 => "BEED", 6 => "BSED-ENG", 7 => "BSED-MATH", 8 => "POLSCI"];

    while ($row = $res->fetch_assoc()) {
        
        // Reconstruct the beautiful name for the UI (e.g., "BSCS - 1A")
        $cName = $courseNames[$row['course_id']] ?? $row['course_id'];
        $sectLabel = $cName . ' - ' . $row['section_name'];
        
        // Online Room Interceptor
        $rawRoom = $row['room_name'] ?? '';
        $finalRoom = 'Online'; 
        if (!empty($rawRoom) && strpos(strtoupper(trim($rawRoom)), 'TBA') === false) {
            $finalRoom = $rawRoom; 
        }

        // Subject and Teacher fallbacks
        $subjName = !empty($row['subject_name']) ? $row['subject_name'] : (!empty($row['subject_code']) ? $row['subject_code'] : 'Unknown Subject');
        $finalTeacher = !empty($row['teacher_name']) ? $row['teacher_name'] : 'TBA';

        $data[] = [
            'subject' => $subjName,
            'section' => $sectLabel,
            'teacher' => $finalTeacher,
            'room' => $finalRoom,
            'datetime' => ($row['day_of_week'] ?? '') . ' ' . ($row['time_slot'] ?? '')
        ];
    }
    
    ob_end_clean(); 
    echo json_encode(['success' => true, 'total' => count($data), 'preview' => array_slice($data, 0, 50)]);
} catch (Throwable $e) { 
    ob_end_clean(); 
    echo json_encode(['success' => false, 'error' => $e->getMessage()]); 
}
?>