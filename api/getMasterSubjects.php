<?php
// thesis/api/getMasterSubjects.php
ob_start(); // 🚨 MAGIC SHIELD: Traps and destroys stray PHP warnings!
header('Content-Type: application/json');
require_once '../config/db_connection.php';

$subjects = [];

// 1. Get Base Subjects
$res = $conn->query("SELECT * FROM subjects");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $id = $row['id'] ?? $row['subject_id'];
        if (!$id && !empty($row)) { $id = current($row); }
        $row['assigned_combos'] = []; // Will hold "BSCS-4" locks
        $subjects[$id] = $row;
    }
}

// 2. Link from course_subjects
$res = $conn->query("SELECT cs.subject_id, c.course_code, cs.year_level FROM course_subjects cs JOIN courses c ON cs.course_id = c.id");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $sid = $row['subject_id'];
        if (isset($subjects[$sid])) {
            $subjects[$sid]['assigned_combos'][] = strtoupper(trim($row['course_code'])) . '-' . trim($row['year_level']);
        }
    }
}

// 3. Link from section_subjects
$res = $conn->query("SELECT ss.subject_id, sec.course, sec.year_level FROM section_subjects ss JOIN sections sec ON ss.section_id = sec.section_id");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $sid = $row['subject_id'];
        if (isset($subjects[$sid])) {
            $subjects[$sid]['assigned_combos'][] = strtoupper(trim($row['course'])) . '-' . trim($row['year_level']);
        }
    }
}

// Safely discard the trapped warnings so they don't break the JSON
$garbage = ob_get_clean(); 

// Output pure, uncorrupted JSON
echo json_encode(['success' => true, 'data' => array_values($subjects)]);
exit;
?>