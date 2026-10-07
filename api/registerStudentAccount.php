<?php
// thesis/api/registerStudentAccount.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
include '../config/db_connection.php';
include 'sendEmail.php'; 
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$student_id = $data["student_id"] ?? "";

if (empty($student_id)) {
    echo json_encode(["status" => "error", "message" => "Student ID required."]);
    exit();
}

// 1. Check if student exists and grab their info
$stmt = $conn->prepare("SELECT full_name, email, user_id FROM students WHERE student_id = ?");
$stmt->bind_param("s", $student_id);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Student not found in the database."]);
    exit();
}

$student = $res->fetch_assoc();

// Check if they are ALREADY registered
if (!empty($student['user_id']) && $student['user_id'] != 0) {
    echo json_encode(["status" => "error", "message" => "Student is already registered!"]);
    exit();
}

$password_plain = "default123";
// Remove or comment out the password_hash line
// $password_hashed = password_hash($password_plain, PASSWORD_DEFAULT);

$userStmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'student')");
$userStmt->bind_param("ss", $student_id, $password_plain); // Use the plain version
if ($userStmt->execute()) {
    
    // 3. Grab the brand new ID from the users table
    $new_user_id = $conn->insert_id;
    
    // 4. Link the new user ID to the student profile
    $updateStudent = $conn->prepare("UPDATE students SET user_id = ? WHERE student_id = ?");
    $updateStudent->bind_param("is", $new_user_id, $student_id);
    
    if ($updateStudent->execute()) {
        // 5. Send email with the PLAIN password so they can log in
        if (function_exists('sendCredentials')) {
            sendCredentials($email, $name, $password_plain, 'Student');
        }
        
        echo json_encode(["status" => "success", "message" => "Account generated & successfully linked to profile!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Account created, but failed to link to student profile."]);
    }
    
} else {
    echo json_encode(["status" => "error", "message" => "Could not create account. Student ID might already exist."]);
}
?>