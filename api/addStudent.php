<?php
// api/addStudent.php

include '../config/db_connection.php';
include 'sendEmail.php'; 

header("Content-Type: application/json");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $student_id = $data["student_id"] ?? "";
    $full_name  = $data["full_name"] ?? "";
    $gender     = $data["gender"] ?? "";
    $email      = $data["email"] ?? "";
    $phone      = $data["phone"] ?? "";
    $course     = $data["course"] ?? "";
    $year_level = $data["year_level"] ?? "";
    $section    = $data["section"] ?? "";

    if (empty($student_id) || empty($full_name) || empty($email)) {
        echo json_encode(["status" => "error", "message" => "School ID, Name, and Email are required"]);
        exit();
    }

    // 1. Check duplicate
    $check = $conn->prepare("SELECT student_id FROM students WHERE student_id = ?");
    $check->bind_param("s", $student_id);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Student ID already exists!"]);
        exit();
    }

    // --- THE SECTION TRANSLATOR ---
    $final_section_name = $section; 
    if (is_numeric($section) && !empty($section)) {
        $sec_stmt = $conn->prepare("SELECT section_name FROM sections WHERE section_id = ?");
        $sec_stmt->bind_param("i", $section);
        $sec_stmt->execute();
        $sec_res = $sec_stmt->get_result();
        if ($sec_row = $sec_res->fetch_assoc()) {
            $final_section_name = $sec_row['section_name']; 
        }
        $sec_stmt->close();
    }

    // --- THE COURSE TRANSLATOR (NEW) ---
    // The DB constraint expects a string (e.g., "BSCS"), but the frontend sends an integer (e.g., "2").
    $final_course_name = $course;
    if (is_numeric($course) && !empty($course)) {
        $course_map = [
            1 => "BSBA", 2 => "BSCS", 3 => "BSTM", 4 => "BSHM",
            5 => "BEED", 6 => "BSED-ENG", 7 => "BSED-MATH", 8 => "POLSCI"
        ];
        // Translate the ID back to the text string before inserting
        $final_course_name = $course_map[$course] ?? $course;
    }

    // --- SET DEFAULT PASSWORD ---
    $plainPassword = "default123";

    // 2. Insert into USERS table
    $stmtUser = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'student')");
    
    // Hash the password for security, aligning with your new password reset flow!
    $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);
    $stmtUser->bind_param("ss", $email, $hashedPassword);

    if ($stmtUser->execute()) {
        $user_id = $stmtUser->insert_id; 

        // 3. Insert into STUDENTS table (Using $final_course_name and $final_section_name)
        $stmt = $conn->prepare("INSERT INTO students (student_id, user_id, full_name, gender, email, phone, course, year_level, section) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sisssssis", $student_id, $user_id, $full_name, $gender, $email, $phone, $final_course_name, $year_level, $final_section_name);

        if ($stmt->execute()) {
            // 4. Send Email (Send the plain password so they know how to log in)
            $emailSent = sendCredentials($email, $full_name, $plainPassword, 'Student');

            // Logs
            $logDesc = "Added Student Account: $full_name (Email Sent: " . ($emailSent ? "Yes" : "No") . ")";
            $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Added Student', '$logDesc')");

            echo json_encode(["status" => "success", "message" => "Student account created successfully!"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to create login. Email might be in use."]);
    }

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>