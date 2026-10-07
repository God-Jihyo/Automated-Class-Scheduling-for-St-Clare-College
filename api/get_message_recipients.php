<?php
// api/get_message_recipients.php
require_once '../config/db_connection.php';
header('Content-Type: application/json');

// Force the same collation so the UNION command doesn't crash!
$sql_teachers = "SELECT teacher_id AS id, full_name COLLATE utf8mb4_general_ci AS name, 'teacher' AS role FROM teachers";
$sql_students = "SELECT student_id AS id, full_name COLLATE utf8mb4_general_ci AS name, 'student' AS role FROM students";

$sql = "$sql_teachers UNION $sql_students ORDER BY name ASC";
$result = $conn->query($sql);

$users = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
}

echo json_encode([
    'success' => true,
    'users' => $users
]);

$conn->close();
?>