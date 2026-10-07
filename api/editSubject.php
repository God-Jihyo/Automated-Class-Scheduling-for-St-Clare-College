<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$id = $data['subject_id'] ?? 0;
$code = $data['code'] ?? '';
$desc = $data['subject_description'] ?? '';
$course = $data['course_id'] ?? 0;
$year = $data['year_level'] ?? 0;
$mode = $data['delivery_mode'] ?? null;
$semester = intval($data['semester'] ?? 1);

// Catch the units
$units = intval($data['units'] ?? 3);

if (!$id || !$code || !$desc || !$course || !$year) {
    echo json_encode(["status" => "error", "message" => "Missing fields"]);
    exit;
}

// 1. Update Basic Info WITH UNITS
$stmt = $conn->prepare("UPDATE subjects SET code=?, subject_description=?, delivery_mode=?, units=? WHERE id=?");
$stmt->bind_param("sssii", $code, $desc, $mode, $units, $id);
$stmt->execute();

// 2. Update Course/Year and Semester Link
$stmt2 = $conn->prepare("UPDATE course_subjects SET course_id=?, year_level=?, semester=? WHERE subject_id=?");
$stmt2->bind_param("iiii", $course, $year, $semester, $id);

if ($stmt2->execute()) {
    $logDesc = "Updated Subject: $code ($units Units, Sem: $semester)";
    $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Updated Subject', '$logDesc')");
    echo json_encode(["status" => "success", "message" => "Subject updated successfully"]);
} else {
    echo json_encode(["status" => "error", "message" => "Update failed: " . $conn->error]);
}
?>