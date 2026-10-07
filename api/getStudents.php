<?php
// thesis/api/getStudents.php
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$q = $_GET['q'] ?? '';
$course = $_GET['course'] ?? '';

$students = [];

// 🚨 THE FIX: We added a LEFT JOIN to the 'sections' table so we can grab 'sec.section_name'!
$query = "
    SELECT s.student_id, s.full_name, s.email, s.year_level, s.user_id,
           COALESCE(c.course_name, s.course) AS display_course,
           COALESCE(sec.section_name, s.section) AS display_section
    FROM students s
    LEFT JOIN courses c ON s.course = c.id
    LEFT JOIN sections sec ON s.section = sec.section_id
    WHERE 1=1
";

// Filter by Name or Student ID
if (!empty($q)) {
    $search = $conn->real_escape_string($q);
    $query .= " AND (s.student_id LIKE '%$search%' OR s.full_name LIKE '%$search%')";
}

// Filter by Course
if (!empty($course)) {
    $c = $conn->real_escape_string($course);
    $courseMap = ['1'=>'BSBA', '2'=>'BSCS', '3'=>'BSTM', '4'=>'BSHM', '5'=>'BEED', '6'=>'BSED-ENG', '7'=>'BSED-MATH', '8'=>'POLSCI'];
    $courseName = $courseMap[$c] ?? $c;
    
    $query .= " AND (s.course = '$c' OR s.course = '$courseName' OR c.course_name = '$courseName')";
}

$query .= " ORDER BY s.year_level ASC, display_section ASC, s.full_name ASC";

$result = $conn->query($query);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $students[] = [
            'student_id' => $row['student_id'],
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'course' => !empty($row['display_course']) ? $row['display_course'] : 'Unassigned',
            'year_level' => !empty($row['year_level']) ? $row['year_level'] : '1',
            
            // 🚨 PERFECT OUTPUT: Now it outputs the real name (e.g. BSCS-1A) instead of '59'
            'section' => !empty($row['display_section']) ? $row['display_section'] : 'A',
            'user_id' => $row['user_id'] 
        ];
    }
}

echo json_encode($students);
$conn->close();
?>