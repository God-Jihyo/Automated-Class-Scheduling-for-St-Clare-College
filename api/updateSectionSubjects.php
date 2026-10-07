<?php
// thesis/api/updateSectionSubjects.php
require_once '../config/db_connection.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$section_id = $data['section_id'] ?? null;
$subjects = $data['subjects'] ?? [];

if (!$section_id) {
    echo json_encode(['success' => false, 'error' => 'Missing section ID']);
    exit;
}

$conn->begin_transaction();
try {
    // 1. Delete all currently assigned subjects for this section
    $stmt1 = $conn->prepare("DELETE FROM section_subjects WHERE section_id = ?");
    $stmt1->bind_param("i", $section_id);
    $stmt1->execute();

    // 2. Insert the newly checked subjects
    if (!empty($subjects)) {
        $stmt2 = $conn->prepare("INSERT INTO section_subjects (section_id, subject_id) VALUES (?, ?)");
        foreach ($subjects as $sub_id) {
            $stmt2->bind_param("ii", $section_id, $sub_id);
            $stmt2->execute();
        }
        
        // 3. Clean up the schedule: Delete schedule blocks for subjects that were REMOVED
        $subs_safe = implode(',', array_map('intval', $subjects));
        $conn->query("DELETE FROM schedule WHERE section_id = $section_id AND subject_id NOT IN ($subs_safe)");
    } else {
        // If ALL subjects were unchecked, wipe the entire schedule for this section
        $conn->query("DELETE FROM schedule WHERE section_id = $section_id");
    }

    $conn->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>