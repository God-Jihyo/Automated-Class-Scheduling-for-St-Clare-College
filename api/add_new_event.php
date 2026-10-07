<?php
// thesis/api/add_new_event.php
error_reporting(0); // Hide visual HTML errors so JSON doesn't break
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$posterPathForDb = ""; // Default empty string

// --- 1. HANDLE POSTER UPLOAD ---
if (isset($_FILES['posterFile']) && $_FILES['posterFile']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../assets/images/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $fileTmpPath = $_FILES['posterFile']['tmp_name'];
    $fileName = $_FILES['posterFile']['name'];
    
    if (getimagesize($fileTmpPath) !== false) {
        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $uniqueFileName = 'poster_' . time() . '_' . uniqid() . '.' . $fileExtension;
        $destFilePath = $uploadDir . $uniqueFileName;

        if (move_uploaded_file($fileTmpPath, $destFilePath)) {
            $posterPathForDb = 'assets/images/' . $uniqueFileName;
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Uploaded file is not a valid image."]);
        exit;
    }
}

// --- 2. GRAB ALL FORM DATA ---
// Matching the "name" attributes from your HTML form
$title = trim($_POST['title'] ?? '');
$type = $_POST['type'] ?? 'academic';
$status = $_POST['status'] ?? 'upcoming';
$start_date = $_POST['startDate'] ?? '';
$end_date = !empty($_POST['endDate']) ? $_POST['endDate'] : NULL;
$start_time = $_POST['startTime'] ?? '';
$end_time = !empty($_POST['endTime']) ? $_POST['endTime'] : NULL;
$location = $_POST['roomId'] ?? '0'; // HTML form sends "0" for campus-wide
$description = trim($_POST['description'] ?? '');
$announcement = trim($_POST['announcement'] ?? '');

// Validation
if (empty($title) || empty($start_date)) {
    if ($posterPathForDb && file_exists('../' . $posterPathForDb)) unlink('../' . $posterPathForDb);
    echo json_encode(["status" => "error", "message" => "Event Title and Start Date are required!"]);
    exit;
}

// --- 3. THE ANTI-CRASH SHIELD (Using your EXACT columns) ---
// Note: We leave out 'id' because the database auto-generates it.
$sql = "INSERT INTO campus_events (title, type, status, start_date, end_date, start_time, end_time, location, description, poster_url, announcement) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
$stmt = $conn->prepare($sql);

if (!$stmt) {
    // If table name is wrong or columns don't match exactly, catch it!
    if ($posterPathForDb && file_exists('../' . $posterPathForDb)) unlink('../' . $posterPathForDb);
    echo json_encode([
        "status" => "error", 
        "message" => "SQL Error: " . $conn->error
    ]);
    exit;
}

// --- 4. BIND AND EXECUTE ---
// "sssssssssss" means we are sending 11 strings to the 11 question marks above
$stmt->bind_param("sssssssssss", $title, $type, $status, $start_date, $end_date, $start_time, $end_time, $location, $description, $posterPathForDb, $announcement);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Event saved successfully!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Database Execution Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>