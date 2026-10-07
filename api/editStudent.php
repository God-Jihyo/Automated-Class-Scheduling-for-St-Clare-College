<?php
// thesis/api/editStudent.php
require_once '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

// MATCHED EXACTLY TO YOUR JAVASCRIPT:
$original_id = trim($data['original_student_id'] ?? '');
$new_id = trim($data['student_id'] ?? '');
$name = trim($data['full_name'] ?? '');
$gender = trim($data['gender'] ?? 'Male');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$course = trim($data['course'] ?? '');
$year = (int)($data['year_level'] ?? 1);
$section = trim($data['section'] ?? '');

if (!$original_id || !$new_id || !$name) {
    echo json_encode(['status' => 'error', 'message' => 'Student ID and Name are required.']);
    exit;
}

// Update all the student's info
$stmt = $conn->prepare("UPDATE students SET student_id=?, full_name=?, gender=?, email=?, phone=?, course=?, year_level=?, section=? WHERE student_id=?");
$stmt->bind_param("ssssssiss", $new_id, $name, $gender, $email, $phone, $course, $year, $section, $original_id);

if ($stmt->execute()) {
    // If the Student ID was changed, update their enrollments too so they don't lose their classes!
    if ($original_id !== $new_id) {
        $conn->query("UPDATE student_enrollments SET student_id='$new_id' WHERE student_id='$original_id'");
    }
    
    // MATCHED EXACTLY TO YOUR JAVASCRIPT:
    echo json_encode(['status' => 'success', 'message' => 'Student updated successfully!']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $conn->error]);
}
?>