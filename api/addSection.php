<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$name = $data['section_name'] ?? '';
$course = $data['course'] ?? '';
$year = $data['year_level'] ?? '';
$subjects = $data['subjects'] ?? [];

if (!$name || !$course || !$year) {
    echo json_encode(["status" => "error", "message" => "Missing fields"]);
    exit;
}

// Insert section
$stmt = $conn->prepare("INSERT INTO sections (section_name, course, year_level) VALUES (?, ?, ?)");
$stmt->bind_param("sii", $name, $course, $year);

if (!$stmt->execute()) {
    echo json_encode(["status" => "error", "message" => "Failed to add section: ".$stmt->error]);
    exit;
}

$section_id = $stmt->insert_id;

// Insert subjects
foreach ($subjects as $sub_id) {
    $s = $conn->prepare("INSERT INTO section_subjects (section_id, subject_id) VALUES (?, ?)");
    $s->bind_param("ii", $section_id, $sub_id);
    if (!$s->execute()) {
        echo json_encode(["status" => "error", "message" => "Failed to add subject ID $sub_id: ".$s->error]);
        exit;
    }
}
//logs
$logDesc = "Added Section: $name ($course $year)";
$conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Added Section', '$logDesc')");
echo json_encode(["status" => "success", "message" => "Section added successfully"]);
