<?php
include '../config/db_connection.php';
header("Content-Type: text/plain"); // Plain text for easy reading

echo "--- DEBUGGING SUBJECT IDS ---\n\n";

// 1. Check for Duplicate Subjects names
echo "1. CHECKING FOR DUPLICATE SUBJECTS:\n";
$dup = $conn->query("
    SELECT subject_description, COUNT(*) c, GROUP_CONCAT(id) as ids 
    FROM subjects 
    GROUP BY subject_description 
    HAVING c > 1
");
if ($dup->num_rows > 0) {
    while($row = $dup->fetch_assoc()) {
        echo "[CRITICAL WARNING] Duplicate Subject Found: '{$row['subject_description']}' has IDs: [{$row['ids']}]\n";
    }
} else {
    echo "No duplicates found by name. Good.\n";
}
echo "\n--------------------------------\n";

// 2. Check a specific Section's requirements vs Teacher Preferences
echo "2. COMPARING SECTION NEEDS VS TEACHER WANTS:\n";

// Get all sections
$secRes = $conn->query("SELECT * FROM sections");
while($sec = $secRes->fetch_assoc()) {
    echo "SECTION: " . $sec['section_name'] . " (ID: " . $sec['section_id'] . ")\n";
    
    // Get subjects for this section
    $subRes = $conn->query("SELECT s.id, s.subject_description FROM section_subjects ss JOIN subjects s ON ss.subject_id = s.id WHERE ss.section_id = " . $sec['section_id']);
    
    while($sub = $subRes->fetch_assoc()) {
        echo "   NEEDS Subject: '" . $sub['subject_description'] . "' (ID: " . $sub['id'] . ")\n";
        
        // Find teachers who prefer this SPECIFIC ID
        $teachRes = $conn->query("SELECT t.full_name, t.teacher_id FROM teacher_subjects ts JOIN teachers t ON ts.teacher_id = t.teacher_id WHERE ts.subject_id = " . $sub['id']);
        
        if ($teachRes->num_rows > 0) {
            while($t = $teachRes->fetch_assoc()) {
                echo "      -> MATCH! Teacher '" . $t['full_name'] . "' (ID: " . $t['teacher_id'] . ") wants this ID.\n";
            }
        } else {
            echo "      -> [PROBLEM] No teacher wants Subject ID " . $sub['id'] . ". (Check if they selected a duplicate ID)\n";
        }
    }
    echo "\n";
}
?>