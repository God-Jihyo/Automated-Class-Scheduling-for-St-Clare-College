<?php
// thesis/repair.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h2>Database Synchronization & Repair (Safe Mode)</h2>";

// 1. Check if the database file exists where we think it does
if (!file_exists('config/db_connection.php')) {
    die("<p style='color:red;'><b>Error:</b> Cannot find config/db_connection.php. Make sure this repair.php file is directly inside your 'thesis' folder.</p>");
}

require_once 'config/db_connection.php';

// 2. Check if the database actually connected
if ($conn->connect_error) {
    die("<p style='color:red;'><b>Database Connection Failed:</b> " . $conn->connect_error . "</p>");
}

echo "<p>Database connected successfully. Attempting repair...</p>";

// 3. Re-link Students
$query1 = "UPDATE students s 
           JOIN users u ON (s.student_id = u.username OR s.email = u.username) 
           SET s.user_id = u.id 
           WHERE u.role = 'student'";

if ($conn->query($query1)) {
    echo "<p style='color:green;'><b>Success:</b> Re-linked " . $conn->affected_rows . " Student profiles.</p>";
} else {
    echo "<p style='color:red;'><b>Student Sync Error:</b> " . $conn->error . "</p>";
}

// 4. Re-link Teachers
$query2 = "UPDATE teachers t 
           JOIN users u ON (t.teacher_id = u.username OR t.email = u.username) 
           SET t.user_id = u.id 
           WHERE u.role IN ('teacher', 'dept_head')";

if ($conn->query($query2)) {
    echo "<p style='color:green;'><b>Success:</b> Re-linked " . $conn->affected_rows . " Teacher profiles.</p>";
} else {
    echo "<p style='color:red;'><b>Teacher Sync Error:</b> " . $conn->error . "</p>";
}

echo "<h3>Repair Complete!</h3>";
echo "<p><a href='logout.php'>Click here to Logout</a>, then log back in.</p>";
?>