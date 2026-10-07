<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

// Enable error reporting to catch issues
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $code = $data["code"] ?? "";
    $desc = $data["subject_description"] ?? "";
    $courseID = intval($data["course_id"] ?? 0);
    $yearLevel = intval($data["year_level"] ?? 0);
    $delivery_mode = $data["delivery_mode"] ?? null; 
    $units = intval($data["units"] ?? 3);
    $semester = intval($data["semester"] ?? 1); 

    if (empty($code) || empty($desc) || empty($courseID) || empty($yearLevel)) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit();
    }

    // 1. Insert Subject (NO SEMESTER HERE - just code, desc, and mode)
    $stmt = $conn->prepare("INSERT INTO subjects (code, subject_description, delivery_mode, units) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sssi", $code, $desc, $delivery_mode, $units);
    $stmt->execute();
    $subjectID = $conn->insert_id;

    // 2. Link to Course/Year AND SEMESTER (This is where semester goes!)
   $stmt2 = $conn->prepare("INSERT INTO course_subjects (course_id, subject_id, year_level, semester) VALUES (?, ?, ?, ?)");
    $stmt2->bind_param("iiii", $courseID, $subjectID, $yearLevel, $semester);
    
    if ($stmt2->execute()) {
        // Logs
        $logDesc = "Added Subject: $code - $desc (Sem: $semester)";
        $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Added Subject', '$logDesc')");
        
        echo json_encode(["status" => "success", "message" => "Subject added successfully"]);
    } else {
        // If this part fails, delete the orphan subject we just created
        $conn->query("DELETE FROM subjects WHERE id = $subjectID");
        echo json_encode(["status" => "error", "message" => "Failed to link course. Check if Course ID $courseID exists in 'courses' table."]);
    }

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>