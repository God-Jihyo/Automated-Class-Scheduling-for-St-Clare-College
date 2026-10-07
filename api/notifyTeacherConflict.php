<?php
// thesis/api/notifyTeacherConflict.php
error_reporting(0);
ini_set('display_errors', 0); 
header('Content-Type: application/json');

ob_start(); // Trap all background errors

try {
    require_once '../config/db_connection.php';
    
    // Read the data sent from the Javascript button
    $data = json_decode(file_get_contents('php://input'), true);
    $roomName = $data['roomName'] ?? '';
    $className = $data['className'] ?? '';

    // 1. Ensure our conflict tracking table exists
    $conn->query("CREATE TABLE IF NOT EXISTS conflict_resolutions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NULL,
        room_name VARCHAR(100),
        class_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Safely find the Room ID
    $roomId = 0;
    $stmt = $conn->prepare("SELECT * FROM rooms WHERE room_name = ? LIMIT 1");
    $stmt->bind_param("s", $roomName);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) { 
        $roomId = (int)($row['id'] ?? $row['room_id'] ?? current($row)); 
    }

    // 3. 🚨 LOCKED TEACHER FINDER 🚨
    date_default_timezone_set('Asia/Manila'); 
    $day = date('l'); 
    $teacherId = 0;

    if ($roomId > 0) {
        $sq = "SELECT s.subject_id, sub.*, sec.* FROM schedule s 
               LEFT JOIN subjects sub ON s.subject_id = sub.id 
               LEFT JOIN sections sec ON s.section_id = sec.section_id 
               WHERE s.room_id = $roomId AND s.day_of_week = '$day'";
               
        $rs = $conn->query($sq);
        $firstValidTeacher = 0; 

        if ($rs) {
            while ($s = $rs->fetch_assoc()) {
                $subId = (int)($s['subject_id'] ?? 0);
                
                if ($subId > 0) {
                    $tReq = $conn->query("SELECT t.teacher_id FROM teacher_subjects ts JOIN teachers t ON ts.teacher_id = t.teacher_id WHERE ts.subject_id = $subId LIMIT 1");
                    
                    if ($tReq && $tRow = $tReq->fetch_assoc()) {
                        // We ONLY extract the teacher_id (e.g., 27) and ignore the user_id completely!
                        $tid = (int)$tRow['teacher_id'];
                        
                        if ($firstValidTeacher === 0) { 
                            $firstValidTeacher = $tid; 
                        }
                        
                        $subjName = !empty($s['subject_name']) ? $s['subject_name'] : (!empty($s['subject_code']) ? $s['subject_code'] : (!empty($s['subject_description']) ? $s['subject_description'] : ''));
                        $sectName = !empty($s['section_name']) ? $s['section_name'] : (!empty($s['course']) ? $s['course'] : 'Unknown Section');
                        $dbClass = trim($subjName . " (" . $sectName . ")");
                        
                        $cleanDb = preg_replace('/[^a-z0-9]/', '', strtolower($dbClass));
                        $cleanSent = preg_replace('/[^a-z0-9]/', '', html_entity_decode(strtolower($className), ENT_QUOTES));
                        
                        if ($cleanDb === $cleanSent || strpos($cleanDb, $cleanSent) !== false) {
                            $teacherId = $tid;
                            break;
                        }
                    }
                }
            }
        }
        
        // Fallback
        if ($teacherId === 0 && $firstValidTeacher > 0) {
            $teacherId = $firstValidTeacher;
        }

        // Nuclear Fallback
        if ($teacherId === 0) {
            $nukeQ = $conn->query("SELECT subject_id FROM schedule WHERE room_id = $roomId LIMIT 1");
            if ($nukeQ && $nRow = $nukeQ->fetch_assoc()) {
                $nSub = (int)$nRow['subject_id'];
                $tNuke = $conn->query("SELECT t.teacher_id FROM teacher_subjects ts JOIN teachers t ON ts.teacher_id = t.teacher_id WHERE ts.subject_id = $nSub LIMIT 1");
                if ($tNuke && $tRow = $tNuke->fetch_assoc()) {
                    $teacherId = (int)$tRow['teacher_id'];
                }
            }
        }
    }

    // 4. Send the Native Database Notification!
    if ($teacherId > 0) {
        $stmt2 = $conn->prepare("INSERT INTO conflict_resolutions (teacher_id, room_name, class_name) VALUES (?, ?, ?)");
        $stmt2->bind_param("iss", $teacherId, $roomName, $className);
        $stmt2->execute();

        $notifMessage = "Action Required: Room Conflict! Your $className class in $roomName is displaced. Click here to resolve.";
        $nCols = [];
        $nRes = $conn->query("SHOW COLUMNS FROM notifications");
        if ($nRes) { while ($c = $nRes->fetch_assoc()) { $nCols[] = $c['Field']; } }

        $fields = []; $values = []; $types = ""; $params = [];

        // 🚨 FORCE IT TO USE EXACTLY TEACHER ID (27) IN THE DATABASE
        if (in_array('account_id', $nCols)) { $fields[] = 'account_id'; $values[] = '?'; $types .= 's'; $params[] = (string)$teacherId; }
        elseif (in_array('user_id', $nCols)) { $fields[] = 'user_id'; $values[] = '?'; $types .= 's'; $params[] = (string)$teacherId; }

        if (in_array('message', $nCols)) { $fields[] = 'message'; $values[] = '?'; $types .= 's'; $params[] = $notifMessage; }
        if (in_array('role', $nCols)) { $fields[] = 'role'; $values[] = '?'; $types .= 's'; $params[] = 'teacher'; }
        if (in_array('type', $nCols)) { $fields[] = 'type'; $values[] = '?'; $types .= 's'; $params[] = 'alert'; }
        if (in_array('is_read', $nCols)) { $fields[] = 'is_read'; $values[] = '?'; $types .= 'i'; $params[] = 0; }

        if (count($fields) > 0) {
            $sql = "INSERT INTO notifications (" . implode(", ", $fields) . ") VALUES (" . implode(", ", $values) . ")";
            $nStmt = $conn->prepare($sql);
            if ($nStmt) {
                $nStmt->bind_param($types, ...$params);
                $nStmt->execute();
            }
        }
        
        ob_end_clean();
        echo json_encode(['success' => true]);
        
    } else {
        ob_end_clean();
        echo json_encode(['success' => false, 'error' => "Could not locate ANY teacher tied to this room."]);
    }

} catch (Throwable $e) {
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => "Fatal Error: " . $e->getMessage()]);
}
?>