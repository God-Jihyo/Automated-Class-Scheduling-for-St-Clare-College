<?php
// api/request_makeup_class.php

error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
require_once '../config/db_connection.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$date = $_POST['date'] ?? '';
$room = $_POST['room'] ?? ''; 
$start_time = $_POST['start_time'] ?? '';
$end_time = $_POST['end_time'] ?? '';
$target_class = $_POST['target_class'] ?? '';
$announcement = $_POST['announcement'] ?? '';
$teacher_id = $_SESSION['account_id'] ?? $_SESSION['user_id'];

if (empty($date) || empty($room) || empty($start_time) || empty($end_time)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all date and time fields.']);
    exit;
}

try {
    // 🔴 PHASE 1: THE CONFLICT CHECKER
    $conflict_sql = "SELECT title, start_time, end_time FROM campus_events 
                     WHERE location = ? AND start_date = ? 
                     AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?)) LIMIT 1";
    $stmt = $conn->prepare($conflict_sql);
    $stmt->bind_param("ssssssss", $room, $date, $start_time, $start_time, $end_time, $end_time, $start_time, $end_time);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $conflict = $result->fetch_assoc();
        echo json_encode(['success' => false, 'message' => "Conflict Detected! {$room} is booked for '{$conflict['title']}'."]);
        $stmt->close();
        exit;
    }
    $stmt->close();

    // 🟢 PHASE 2: SAVE AS AN OFFICIAL EVENT
    $title = "MAKE-UP CLASS: " . $target_class;
    $type = "Academic";
    $status = "upcoming";
    $description = "Temporary rescheduling of regular class. Attendance is required.";

    $insert_sql = "INSERT INTO campus_events (title, type, status, start_date, end_date, start_time, end_time, location, description, announcement) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt2 = $conn->prepare($insert_sql);
    $stmt2->bind_param("ssssssssss", $title, $type, $status, $date, $date, $start_time, $end_time, $room, $description, $announcement);
    $event_saved = $stmt2->execute();
    $stmt2->close();

    if ($event_saved) {
        // 🔔 PHASE 3: THE AUTO-NOTIFIER ENGINE
        
        // 1. Notify the Teacher it was successful
        $t_msg = "✅ Make-Up Class for {$target_class} secured on {$date} at {$room}.";
        $conn->query("INSERT INTO notifications (account_id, role, message, type) VALUES ('$teacher_id', 'teacher', '$t_msg', 'success')");

        // 2. Find the exact Section Name (Extracts "BSCS 1A" from "IT101 (BSCS 1A)")
        preg_match('/\((.*?)\)/', $target_class, $match);
        $section_name = $match[1] ?? '';

        // 3. Find every student in that section and send them a warning alert!
        if (!empty($section_name)) {
            $sec_stmt = $conn->prepare("SELECT st.student_id FROM students st JOIN sections sec ON st.section = sec.section_id WHERE sec.section_name = ?");
            $sec_stmt->bind_param("s", $section_name);
            $sec_stmt->execute();
            $sec_res = $sec_stmt->get_result();

            // Format the time nicely for the notification
            $time_formatted = date("g:i A", strtotime($start_time));
            $s_msg = "🚨 URGENT: {$target_class} has been rescheduled to {$date} at {$time_formatted} in {$room}. Please check your Visual Schedule!";

            $insert_notif = $conn->prepare("INSERT INTO notifications (account_id, role, message, type) VALUES (?, 'student', ?, 'alert')");
            while ($row = $sec_res->fetch_assoc()) {
                $sid = $row['student_id'];
                $insert_notif->bind_param("ss", $sid, $s_msg);
                $insert_notif->execute();
            }
            $insert_notif->close();
            $sec_stmt->close();
        }

        echo json_encode(['success' => true, 'message' => 'Room secured! Notifications sent to students.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database Error saving event.']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}

$conn->close();
?>