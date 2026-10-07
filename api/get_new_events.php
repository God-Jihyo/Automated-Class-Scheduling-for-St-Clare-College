<?php
// thesis/api/get_new_events.php
session_start();
error_reporting(0); // Prevent PHP warnings from breaking JSON format
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$role = strtolower(trim($_SESSION['role'] ?? 'unknown'));
$account_id = $_SESSION['account_id'] ?? $_SESSION['user_id'] ?? '';

// 🔥 FIX 1: Safely grab the string section name (e.g. 'BSCS 4C') without the broken JOIN
$student_section = $_SESSION['section_id'] ?? "";

if (empty($student_section) && $role === 'student') {
    $sec_stmt = $conn->prepare("SELECT section FROM students WHERE student_id = ? OR email = ? LIMIT 1");
    $sec_stmt->bind_param("ss", $account_id, $account_id);
    $sec_stmt->execute();
    $sec_res = $sec_stmt->get_result();
    if ($sec_row = $sec_res->fetch_assoc()) {
        $student_section = $sec_row['section'];
    }
    $sec_stmt->close();
}

$query = "SELECT * FROM campus_events WHERE start_date >= CURDATE() ORDER BY start_date ASC";
$result = $conn->query($query);
$events = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        $title = $row['title'] ?? 'Untitled Event';
        $titleUpper = strtoupper($title);
        
        // 🔥 THE SMART FILTER 🔥
        // This catches "Make-up", "Makeup", and "Reschedule"
        if (strpos($titleUpper, 'MAKE-UP') !== false || strpos($titleUpper, 'MAKEUP') !== false || strpos($titleUpper, 'RESCHEDULE') !== false) {
            if ($role === 'student') {
                // If the event title DOES NOT contain the student's section (e.g., 'BSCS 4C'), skip it!
                if (empty($student_section) || strpos($titleUpper, strtoupper($student_section)) === false) {
                    continue; 
                }
            }
        }
        
        $events[] = [
            'id' => $row['id'],
            'title' => $title,
            'type' => $row['type'] ?? 'other',
            'status' => $row['status'] ?? 'upcoming',
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'startTime' => $row['start_time'],
            'endTime' => $row['end_time'],
            'location' => $row['location'] ?? 'TBA',
            'description' => $row['description'] ?? 'No description provided.',
            'posterUrl' => $row['poster_url'] ?? '',
            'announcement' => $row['announcement'] ?? '',
            'organizer' => 'Teacher'
        ];
    }
}

echo json_encode(['success' => true, 'data' => array_values($events)]);
$conn->close();
?>