<?php
// thesis/api/getReplacementRooms.php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');
ob_start(); // Shield against background HTML errors

try {
    require_once '../config/db_connection.php';
    
    $conflictId = (int)($_GET['conflict_id'] ?? 0);
    if ($conflictId === 0) throw new Exception("Invalid Conflict ID");

    // 1. Get the displaced class details
    $cReq = $conn->query("SELECT * FROM conflict_resolutions WHERE id = $conflictId");
    if (!$cReq || $cReq->num_rows === 0) throw new Exception("Conflict not found.");
    $conflict = $cReq->fetch_assoc();
    $roomName = $conflict['room_name'];
    $className = $conflict['class_name'];

    // 2. Safely find the Room ID
    // 🚨 THE FIX: Removed "OR name = ?" so it perfectly matches your database!
    $roomId = 0;
    $stmt = $conn->prepare("SELECT * FROM rooms WHERE room_name = ? LIMIT 1");
    $stmt->bind_param("s", $roomName);
    $stmt->execute();
    $rRes = $stmt->get_result();
    if ($r = $rRes->fetch_assoc()) {
        $roomId = (int)($r['id'] ?? $r['room_id'] ?? current($r));
    }

    date_default_timezone_set('Asia/Manila'); 
    $day = date('l');
    $todayDate = date('Y-m-d');

    // 3. Find the EXACT Time Slot of the displaced class
    $classStart = "";
    $classEnd = "";

    if ($roomId > 0) {
        // Safe wildcard query
        $sq = $conn->query("SELECT s.time_slot, sub.*, sec.* FROM schedule s LEFT JOIN subjects sub ON s.subject_id = sub.id LEFT JOIN sections sec ON s.section_id = sec.section_id WHERE s.room_id = $roomId AND s.day_of_week = '$day'");
        
        if ($sq) {
            while ($s = $sq->fetch_assoc()) {
                $subjName = !empty($s['subject_name']) ? $s['subject_name'] : (!empty($s['subject_code']) ? $s['subject_code'] : (!empty($s['subject_description']) ? $s['subject_description'] : ''));
                $sectName = !empty($s['section_name']) ? $s['section_name'] : (!empty($s['course']) ? $s['course'] : '');
                $dbClass = trim($subjName . " (" . $sectName . ")");

                $cleanDb = preg_replace('/[^a-z0-9]/', '', strtolower($dbClass));
                $cleanSent = preg_replace('/[^a-z0-9]/', '', strtolower($className));

                if ($cleanDb === $cleanSent || strpos($cleanDb, $cleanSent) !== false) {
                    $times = explode('-', $s['time_slot']);
                    if (count($times) == 2) {
                        $classStart = date("H:i", strtotime(trim($times[0])));
                        $classEnd = date("H:i", strtotime(trim($times[1])));
                        break;
                    }
                }
            }
        }
    }

    // Fallback: If exact match fails, grab ANY class in that room today to get a time frame
    if ($classStart === "" && $roomId > 0) {
        $fb = $conn->query("SELECT time_slot FROM schedule WHERE room_id = $roomId AND day_of_week = '$day' LIMIT 1");
        if ($fb && $fbRow = $fb->fetch_assoc()) {
             $times = explode('-', $fbRow['time_slot']);
             if (count($times) == 2) {
                 $classStart = date("H:i", strtotime(trim($times[0])));
                 $classEnd = date("H:i", strtotime(trim($times[1])));
             }
        }
    }

    // 4. Scan all other rooms 
    $availableRooms = [];
    $allRooms = $conn->query("SELECT * FROM rooms");
    
    if ($allRooms) {
        while ($rm = $allRooms->fetch_assoc()) {
            $checkRoomId = (int)($rm['id'] ?? $rm['room_id'] ?? current($rm));
            if ($checkRoomId == $roomId) continue; // Skip the original room

            // Safely check status in PHP instead of SQL
            $status = strtolower($rm['status'] ?? '');
            if ($status === 'maintenance') continue;

            $isAvailable = true;

            if ($classStart !== "" && $classEnd !== "") {
                // Check Regular Classes
                $sCheck = $conn->query("SELECT time_slot FROM schedule WHERE room_id = $checkRoomId AND day_of_week = '$day'");
                if ($sCheck) {
                    while ($sc = $sCheck->fetch_assoc()) {
                        $t = explode('-', $sc['time_slot']);
                        if (count($t) == 2) {
                            $sSt = date("H:i", strtotime(trim($t[0])));
                            $sEn = date("H:i", strtotime(trim($t[1])));
                            if ($classStart < $sEn && $classEnd > $sSt) { $isAvailable = false; break; }
                        }
                    }
                }

                // Check Reservations Safely
                if ($isAvailable) {
                    $rCheck = $conn->query("SELECT * FROM room_reservations WHERE room_id = $checkRoomId AND reservation_date = '$todayDate'");
                    if ($rCheck) {
                        while ($rc = $rCheck->fetch_assoc()) {
                            $rSt = date("H:i", strtotime($rc['start_time'] ?? '00:00'));
                            $rEn = date("H:i", strtotime($rc['end_time'] ?? '00:00'));
                            if ($classStart < $rEn && $classEnd > $rSt) { $isAvailable = false; break; }
                        }
                    }
                }

                // Check Events Safely
                if ($isAvailable) {
                    $eCheck = $conn->query("SELECT * FROM campus_events WHERE (location = '$checkRoomId' OR location = 'Room ID: $checkRoomId') AND start_date = '$todayDate'");
                    if ($eCheck) {
                        while ($ec = $eCheck->fetch_assoc()) {
                            $eSt = date("H:i", strtotime($ec['start_time'] ?? '00:00'));
                            $eEn = date("H:i", strtotime($ec['end_time'] ?? '00:00'));
                            if ($classStart < $eEn && $classEnd > $eSt) { $isAvailable = false; break; }
                        }
                    }
                }
            }

            if ($isAvailable) {
                $rName = $rm['room_name'] ?? $rm['name'] ?? 'Room ' . $checkRoomId;
                $rBldg = $rm['building'] ?? 'Campus';
                
                $availableRooms[] = [
                    'name' => $rName,
                    'building' => $rBldg
                ];
            }
        }
    }

    $formattedSlot = ($classStart && $classEnd) ? date("g:i A", strtotime($classStart)) . ' - ' . date("g:i A", strtotime($classEnd)) : 'All Day Availability';

    ob_end_clean();
    echo json_encode(['success' => true, 'rooms' => $availableRooms, 'slot' => $formattedSlot]);

} catch (Throwable $e) {
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>