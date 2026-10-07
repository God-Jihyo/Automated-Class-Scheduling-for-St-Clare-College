<?php
include '../config/db_connection.php';
header("Content-Type: application/json");

$search = $_GET['q'] ?? "";
$page   = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit  = 10;
$offset = ($page - 1) * $limit;

// =========================================================================
// NEW LOGIC: PRE-CALCULATE ALL GLOBAL CONFLICTS FIRST
// This matches your getConflicts.php logic to check Teachers and Rooms across all sections
// =========================================================================
$allSchedQuery = $conn->query("SELECT schedule_id, section_id, teacher_id, room_id, day_of_week, time_slot FROM schedule");
$globalSchedules = [];
if ($allSchedQuery) {
    while($row = $allSchedQuery->fetch_assoc()){
        $globalSchedules[$row['day_of_week']][] = $row;
    }
}

$conflictedSectionIds = [];
foreach ($globalSchedules as $day => $day_scheds) {
    $count = count($day_scheds);
    for ($i = 0; $i < $count; $i++) {
        for ($j = $i + 1; $j < $count; $j++) {
            $s1 = $day_scheds[$i];
            $s2 = $day_scheds[$j];

            $t1 = explode('-', $s1['time_slot']);
            $t2 = explode('-', $s2['time_slot']);
            if (count($t1) !== 2 || count($t2) !== 2) continue;

            $start1 = strtotime(trim($t1[0]));
            $end1   = strtotime(trim($t1[1]));
            $start2 = strtotime(trim($t2[0]));
            $end2   = strtotime(trim($t2[1]));

            // If times overlap
            if ($start1 < $end2 && $start2 < $end1) {
                // 1. Same section overlapping itself
                if ($s1['section_id'] === $s2['section_id']) {
                    $conflictedSectionIds[] = $s1['section_id'];
                }
                // 2. Teacher double booked across ANY section
                if (!empty($s1['teacher_id']) && $s1['teacher_id'] === $s2['teacher_id']) {
                    $conflictedSectionIds[] = $s1['section_id'];
                    $conflictedSectionIds[] = $s2['section_id'];
                }
                // 3. Room double booked across ANY section
                if (!empty($s1['room_id']) && $s1['room_id'] === $s2['room_id']) {
                    $conflictedSectionIds[] = $s1['section_id'];
                    $conflictedSectionIds[] = $s2['section_id'];
                }
            }
        }
    }
}
// Remove duplicates
$conflictedSectionIds = array_unique($conflictedSectionIds);
// =========================================================================

$sql = "SELECT s.*, 
        (SELECT COUNT(*) FROM section_subjects ss WHERE ss.section_id = s.section_id) as subjects_count,
        (SELECT COUNT(*) FROM students st WHERE st.section = s.section_id) as students_count
        FROM sections s WHERE 1=1";

if (!empty($search)) {
    $search = $conn->real_escape_string($search);
    $sql .= " AND (s.section_name LIKE '%$search%' OR s.course LIKE '%$search%')";
}

// COUNT total rows for pagination
$countRes = $conn->query($sql);
$totalRows = $countRes ? $countRes->num_rows : 0;

$sql .= " ORDER BY s.section_id DESC LIMIT $limit OFFSET $offset";
$res = $conn->query($sql);

$data = [];
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $section_id = $row['section_id'];
        
        // Default Status
        $status = "Incomplete";
        $statusClass = "status-incomplete";

        // Check against our pre-calculated global conflicts array
        $hasConflict = in_array($section_id, $conflictedSectionIds);

        // 1. Get required subjects to check completeness
        $reqSubjQuery = $conn->query("SELECT subject_id FROM section_subjects WHERE section_id = $section_id");
        $requiredSubjects = [];
        if ($reqSubjQuery) {
            while($req = $reqSubjQuery->fetch_assoc()) {
                $requiredSubjects[] = $req['subject_id'];
            }
        }

        if (count($requiredSubjects) > 0) {
            // Calculate hours to see if it is complete
            $schedQuery = $conn->query("SELECT subject_id, time_slot FROM schedule WHERE section_id = $section_id");
            $subjectHours = [];
            
            if ($schedQuery) {
                while($sched = $schedQuery->fetch_assoc()) {
                    $subjId = $sched['subject_id'] ?? 0;
                    $times = explode('-', $sched['time_slot']);
                    if (count($times) == 2) {
                        $start = strtotime(trim($times[0]));
                        $end = strtotime(trim($times[1]));
                        if ($start && $end) {
                            $hours = ($end - $start) / 3600;
                            if (!isset($subjectHours[$subjId])) $subjectHours[$subjId] = 0;
                            $subjectHours[$subjId] += $hours;
                        }
                    }
                }
            }

            $isComplete = true;
            foreach ($requiredSubjects as $reqSubjId) {
                // Check if the subject has at least ~3 hours
                if (!isset($subjectHours[$reqSubjId]) || $subjectHours[$reqSubjId] < 2.9) {
                    $isComplete = false;
                    break;
                }
            }

            // =============================================================
            // APPLY PRIORITY LOGIC
            // Conflict ALWAYS overrides Complete
            // =============================================================
            if ($hasConflict) {
                $status = "Conflict";
                $statusClass = "status-conflict";
            } elseif ($isComplete) {
                $status = "Complete";
                $statusClass = "status-complete";
            }
        }

        // Attach to the row so JavaScript can use it
        $row['schedule_status_text'] = $status;
        $row['schedule_status_class'] = $statusClass;

        $data[] = $row;
    }
}

echo json_encode([
    "sections" => $data,
    "total" => $totalRows,
    "page" => $page,
    "limit" => $limit
]);
?>