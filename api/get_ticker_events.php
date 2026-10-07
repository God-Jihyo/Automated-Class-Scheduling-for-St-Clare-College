<?php
// api/get_ticker_events.php

error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

$role = $_SESSION['role'] ?? 'unknown';
$account_id = $_SESSION['account_id'] ?? $_SESSION['user_id'] ?? '';

// Fetch the student's section name
$student_section = "";
if ($role === 'student') {
    $sec_stmt = $conn->prepare("SELECT sec.section_name FROM students st JOIN sections sec ON st.section = sec.section_id WHERE st.student_id = ?");
    $sec_stmt->bind_param("s", $account_id);
    $sec_stmt->execute();
    $sec_res = $sec_stmt->get_result();
    if ($sec_row = $sec_res->fetch_assoc()) {
        $student_section = $sec_row['section_name'];
    }
    $sec_stmt->close();
}

$sql = "SELECT title, start_date, location, type FROM campus_events WHERE start_date >= CURDATE() ORDER BY start_date ASC";
$result = $conn->query($sql);

$events_array = [];
$count = 0;

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        if ($count >= 5) break; // Only take the first 5 VALID events

        $title = $row['title'];
        
        // 🔥 THE SMART FILTER FOR TICKER 🔥
        if (strpos(strtoupper($title), 'MAKE-UP CLASS') !== false) {
            if ($role === 'student') {
                if (empty($student_section) || strpos($title, $student_section) === false) {
                    continue; 
                }
            }
        }

        $date = date("M j", strtotime($row['start_date']));
        $loc = !empty($row['location']) ? $row['location'] : 'TBA';
        
        $type = strtolower($row['type'] ?? '');
        $icon = "📌"; 
        if (strpos($type, 'academic') !== false || strpos($type, 'seminar') !== false) $icon = "🎓";
        if (strpos($type, 'sport') !== false || strpos($type, 'game') !== false) $icon = "🏆";
        if (strpos($type, 'social') !== false || strpos($type, 'party') !== false) $icon = "🎉";
        
        $events_array[] = "{$icon} <strong style='color: #ffffff; text-transform: uppercase;'>" . htmlspecialchars($title) . "</strong> &nbsp;•&nbsp; <span style='color: #ffffff;'><i class='fa-regular fa-calendar'></i> " . $date . "</span> &nbsp;•&nbsp; <span style='color: #ffffff;'><i class='fa-solid fa-location-dot'></i> " . htmlspecialchars($loc) . "</span>";
        $count++;
    }
}

if (count($events_array) === 0) {
    $events_array[] = "✨ Welcome to the SCC Portal! Keep an eye out for upcoming announcements.";
}

$separator = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⭐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
$ticker_string = implode($separator, $events_array);

echo json_encode([
    'success' => true,
    'ticker_text' => $ticker_string
]);

$conn->close();
?>