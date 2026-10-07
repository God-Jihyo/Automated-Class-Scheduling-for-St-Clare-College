<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$id             = $data["teacher_id"] ?? 0;
$full_name      = $data["full_name"] ?? "";
$gender         = $data["gender"] ?? "";
$email          = $data["email"] ?? "";
$phone          = $data["phone"] ?? "";
$department     = $data["department"] ?? "";
$position       = $data["position"] ?? "";
$specialization = $data["specialization"] ?? "";
$teaching_load  = $data["teaching_load"] ?? "";
$is_strict      = !empty($data["is_strict"]) ? 1 : 0;
$subjects       = $data["preferred_subjects"] ?? [];

if (!$id || empty($full_name)) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit();
}

// 1. Update Teacher Info
$stmt = $conn->prepare("UPDATE teachers SET full_name=?, gender=?, email=?, phone=?, department=?, position=?, specialization=?, teaching_load=?, is_strict=? WHERE teacher_id=?");
$stmt->bind_param("ssssssssii", $full_name, $gender, $email, $phone, $department, $position, $specialization, $teaching_load, $is_strict, $id);

if (!$stmt->execute()) {
    echo json_encode(["status" => "error", "message" => "Update failed: " . $stmt->error]);
    exit;
}

// 2. Update Preferences (Delete Old -> Insert New)
$del = $conn->prepare("DELETE FROM teacher_subjects WHERE teacher_id=?");
$del->bind_param("i", $id);
$del->execute();

if (!empty($subjects)) {
    $ins = $conn->prepare("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)");
    foreach ($subjects as $sub_id) {
        $ins->bind_param("ii", $id, $sub_id);
        $ins->execute();
    }
}
//logs
$logDesc = "Updated Teacher: $full_name";
$conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Updated Teacher', '$logDesc')");
//
echo json_encode(["status" => "success", "message" => "Teacher updated successfully"]);
?>