<?php
// thesis/api/getRooms.php
error_reporting(0);
ini_set('display_errors', 0); // Extra shield to ensure no HTML breaks the JSON
header('Content-Type: application/json');

ob_start(); // Trap any invisible background warnings

require_once '../config/db_connection.php';

// Set timezone to Philippines so real-time class checking is accurate!
date_default_timezone_set('Asia/Manila'); 
$currentDay = date('l'); 
$currentTime = date('H:i'); 

$rooms = [];
$result = $conn->query("SELECT * FROM rooms");

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['name'] = !empty($row['room_name']) ? (string)$row['room_name'] : (!empty($row['name']) ? (string)$row['name'] : 'Unknown Room');
        $row['building'] = !empty($row['building']) ? (string)$row['building'] : 'Unknown Building';
        $row['status'] = !empty($row['status']) ? (string)$row['status'] : 'available';
        
        $rawAmenities = !empty($row['amenities']) ? $row['amenities'] : '';
        $row['amenities'] = (is_string($rawAmenities) && trim($rawAmenities) !== '') ? array_map('trim', explode(',', $rawAmenities)) : [];

        $roomId = (int)($row['id'] ?? current($row));
        $reservations = [];
        
        // 1. Get Old Events for this room
        $resQuery = "SELECT * FROM room_reservations WHERE room_id = $roomId AND reservation_date >= CURDATE()";
        $resResult = $conn->query($resQuery);
        if ($resResult) {
            while ($resRow = $resResult->fetch_assoc()) {
                $reservations[] = [
                    'date' => $resRow['reservation_date'],
                    'eventName' => $resRow['event_name'],
                    'name' => $resRow['event_name'], // Added so JS can read it
                    'startTime' => $resRow['start_time'],
                    'endTime' => $resRow['end_time']
                ];
            }
        }
        
        // 2. Get New Modern Events for this room (Checks both formats safely)
        $ceQuery = "SELECT * FROM campus_events WHERE (location = 'Room ID: $roomId' OR location = '$roomId') AND start_date >= CURDATE()";
        $ceResult = $conn->query($ceQuery);
        if ($ceResult) {
            while ($ceRow = $ceResult->fetch_assoc()) {
                $reservations[] = [
                    'date' => $ceRow['start_date'],
                    'eventName' => $ceRow['title'],
                    'name' => $ceRow['title'], // Added so JS can read it
                    'startTime' => $ceRow['start_time'],
                    'endTime' => $ceRow['end_time']
                ];
            }
        }

        // Sort upcoming reservations chronologically safely
        usort($reservations, function($a, $b) {
            $timeA = strtotime($a['date'] . ' ' . $a['startTime']) ?: 0;
            $timeB = strtotime($b['date'] . ' ' . $b['startTime']) ?: 0;
            return $timeA <=> $timeB;
        });
        
        $row['reservations'] = $reservations;
        $row['upcomingReservations'] = $reservations;

        // 3. LIVE SCHEDULE CHECKER! (Who is in the room right now?)
        $currentClass = null;
        $currentTeacher = null;
        $nextAvailable = null;
        $allTodayClasses = []; // Array to hold classes for our conflict checker
        
        // 🚨 ADDED `s.subject_id` SO WE CAN FIND THE TEACHER!
        $schedQuery = "SELECT s.time_slot, s.subject_id, sub.subject_description, sec.section_name 
                       FROM schedule s 
                       LEFT JOIN subjects sub ON s.subject_id = sub.id 
                       LEFT JOIN sections sec ON s.section_id = sec.section_id 
                       WHERE s.room_id = $roomId AND s.day_of_week = '$currentDay'";
        
        $schedResult = $conn->query($schedQuery);
        if ($schedResult) {
            while ($schedRow = $schedResult->fetch_assoc()) {
                $timeSlot = $schedRow['time_slot']; 
                if (!$timeSlot) continue;
                
                $times = explode('-', $timeSlot);
                
                if (count($times) == 2) {
                    $start = date("H:i", strtotime(trim($times[0])));
                    $end = date("H:i", strtotime(trim($times[1])));
                    
                    $className = $schedRow['subject_description'] . " (" . $schedRow['section_name'] . ")";
                    
                    // 🚨 SAFE TEACHER FETCH 
                    // Safely links the subject_id to the exact teacher's full_name
                    $teacherName = "Unknown Teacher";
                    $subjectId = (int)($schedRow['subject_id'] ?? 0);
                    
                    if ($subjectId > 0) {
                        $tq = "SELECT t.full_name FROM teacher_subjects ts JOIN teachers t ON ts.teacher_id = t.teacher_id WHERE ts.subject_id = $subjectId LIMIT 1";
                        $tres = $conn->query($tq);
                        if ($tres && $trow = $tres->fetch_assoc()) {
                            if (!empty($trow['full_name'])) {
                                $teacherName = trim($trow['full_name']);
                            }
                        }
                    }
                    
                    // Save for the Clash Detector below
                    $allTodayClasses[] = [
                        'start' => $start,
                        'end' => $end,
                        'name' => $className,
                        'teacherName' => $teacherName
                    ];
                    
                    // If the current real-world time is inside this class window...
                    if ($currentTime >= $start && $currentTime <= $end) {
                        $currentClass = $className;
                        $currentTeacher = $teacherName;
                        $nextAvailable = date("h:i A", strtotime($end));
                        
                        if ($row['status'] == 'available') {
                            $row['status'] = 'occupied';
                        }
                    }
                }
            }
        }
        
        $row['currentClass'] = $currentClass;
        $row['currentTeacher'] = $currentTeacher;
        $row['nextAvailable'] = $nextAvailable;

        // ==========================================
        // 🚨 THE CLASH DETECTOR 
        // ==========================================
        $todayDate = date('Y-m-d');
        $conflictMessages = [];

        foreach ($reservations as $res) {
            // Only check events happening today that have a valid start time
            if ($res['date'] === $todayDate && !empty($res['startTime'])) {
                $evtStart = date("H:i", strtotime($res['startTime']));
                $evtEnd = date("H:i", strtotime($res['endTime']));

                // Compare it against every single class happening in this room today
                foreach ($allTodayClasses as $cls) {
                    // Overlap Logic
                    if ($evtStart < $cls['end'] && $evtEnd > $cls['start']) {
                        $row['status'] = 'conflict'; // Trigger the red UI
                        
                        // 🚨 UPDATED MESSAGE: Now includes the Teacher's name!
                        $conflictMessages[] = "Event '{$res['name']}' displaces {$cls['teacherName']}'s class {$cls['name']} at " . date("h:i A", strtotime($evtStart)) . ".";
                    }
                }
            }
        }
        
        if (!empty($conflictMessages)) {
            $row['alerts'] = $conflictMessages;
        }

        $rooms[] = $row;
    }
}

ob_end_clean(); // Securely erase any hidden PHP errors before sending the JSON

echo json_encode([
    "success" => true,
    "data" => $rooms
]);
$conn->close();
?>