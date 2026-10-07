<?php
// thesis/api/save_virtual_links.php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);
require_once '../config/db_connection.php';
header('Content-Type: application/json');

ob_start();

try {
    $teacher_id = trim($_POST['teacher_id'] ?? ($_SESSION['account_id'] ?? ''));
    $subject_code = trim($_POST['subject_code'] ?? ''); // e.g. HCI101
    $section_name = trim($_POST['section_name'] ?? ''); // e.g. BSCS-1A
    $gmeet_link = trim($_POST['gmeet_link'] ?? '');
    $classroom_code = trim($_POST['classroom_code'] ?? '');

    if (empty($teacher_id)) throw new Exception('Teacher ID is missing. Please refresh the page.');
    if (empty($subject_code)) throw new Exception('Subject Code is missing.');
    if (empty($section_name)) throw new Exception('Section Name is missing.');

    // ==========================================
    // STEP 1: SAFELY FIND THE SUBJECT ID
    // ==========================================
    $subject_id = null;
    $res = $conn->query("SELECT * FROM subjects");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            // Search every column for the text (HCI101) to find its true ID
            foreach($row as $col => $val) {
                if (strcasecmp((string)$val, $subject_code) === 0) {
                    $subject_id = $row['id'] ?? null;
                    break 2; // Break out of both loops
                }
            }
        }
    }
    if (!$subject_id) throw new Exception("Could not find a match for Subject: " . $subject_code);

    // ==========================================
    // STEP 2: SAFELY FIND THE SECTION ID
    // ==========================================
    $section_id = null;
    $res2 = $conn->query("SELECT * FROM sections");
    if ($res2) {
        while ($row = $res2->fetch_assoc()) {
            // Search every column for the section text
            foreach($row as $col => $val) {
                if (strcasecmp((string)$val, $section_name) === 0) {
                    $section_id = $row['section_id'] ?? $row['id'] ?? null;
                    break 2;
                }
            }
        }
    }
    if (!$section_id) throw new Exception("Could not find a match for Section: " . $section_name);

    // ==========================================
    // STEP 3: UPDATE THE SCHEDULE DIRECTLY
    // ==========================================
    // Now we are using pure integer IDs, which SQL loves! No JOINS needed.
    $sql = "UPDATE schedule 
            SET gmeet_link = ?, classroom_code = ? 
            WHERE teacher_id = ? AND subject_id = ? AND section_id = ?";
            
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("SQL Prepare Error: " . $conn->error);

    $stmt->bind_param("sssss", $gmeet_link, $classroom_code, $teacher_id, $subject_id, $section_id);
    
    if (!$stmt->execute()) {
        throw new Exception('Database execute error: ' . $stmt->error);
    }
    
    // Success response!
    echo json_encode(['success' => true, 'message' => 'Virtual class links successfully applied!']);
    ob_end_flush();

} catch (Exception $e) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>