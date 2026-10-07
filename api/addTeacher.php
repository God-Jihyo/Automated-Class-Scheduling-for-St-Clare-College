<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start(); // QUARANTINE: Trap any HTML warnings

header("Content-Type: application/json");

try {
    include '../config/db_connection.php';
    include 'sendEmail.php'; 

    $data = json_decode(file_get_contents("php://input"), true);

    $full_name      = $data["full_name"] ?? "";
    $gender         = $data["gender"] ?? "";
    $email          = $data["email"] ?? "";
    $phone          = $data["phone"] ?? "";
    $department     = $data["department"] ?? "";
    $position       = $data["position"] ?? "";
    $specialization = $data["specialization"] ?? "";
    $teaching_load  = $data["teaching_load"] ?? "";
    $preferred_subjects = $data["preferred_subjects"] ?? []; 
    $is_strict      = !empty($data["is_strict"]) ? 1 : 0;
    $preferred_day  = $data["preferred_day"] ?? "Any"; 

    if (empty($full_name) || empty($department) || empty($email)) {
        throw new Exception("Name, Department, and Email are required");
    }

    $plainPassword = "default123"; 

    $stmtUser = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'teacher')");
    $stmtUser->bind_param("ss", $email, $plainPassword);

    if ($stmtUser->execute()) {
        $user_id = $stmtUser->insert_id;

        $stmt = $conn->prepare("INSERT INTO teachers (user_id, full_name, gender, email, phone, department, position, specialization, teaching_load, is_strict, preferred_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssssssis", $user_id, $full_name, $gender, $email, $phone, $department, $position, $specialization, $teaching_load, $is_strict, $preferred_day);

        if ($stmt->execute()) {
            $teacher_id = $stmt->insert_id;

            if (!empty($preferred_subjects) && is_array($preferred_subjects)) {
                $subStmt = $conn->prepare("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)");
                foreach ($preferred_subjects as $sub_id) {
                    $sub_id = intval($sub_id);
                    $subStmt->bind_param("ii", $teacher_id, $sub_id);
                    $subStmt->execute();
                }
            }

            @sendCredentials($email, $full_name, $plainPassword, 'Teacher');
            $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Added Teacher', 'Added Teacher Account: $full_name')");

            ob_end_clean(); // Purge any trapped HTML
            echo json_encode(["status" => "success", "message" => "Teacher account created!"]);
        } else {
            throw new Exception("Failed to save profile: " . $stmt->error);
        }
    } else {
        throw new Exception("Failed to create account. Email might be taken.");
    }
} catch (\Throwable $e) {
    ob_end_clean(); // Purge trapped HTML
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>