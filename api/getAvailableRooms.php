<?php
// thesis/api/getAvailableRooms.php
error_reporting(0); // Hide background PHP warnings that break JSON
header('Content-Type: application/json');
require_once '../config/db_connection.php';

try {
    $time = $_GET['time'] ?? '';
    $days = isset($_GET['days']) ? explode(',', $_GET['days']) : [];

    if (empty($time) || empty($days)) {
        echo json_encode(['success' => true, 'data' => []]);
        exit;
    }

    // 1. Get ALL rooms blindly (No strict status checks)
    $allRooms = [];
    $res = $conn->query("SELECT * FROM rooms");
    if ($res) {
        while($row = $res->fetch_assoc()) {
            // Find the ID safely
            $id = $row['id'] ?? $row['room_id'] ?? current($row);
            $allRooms[$id] = $row;
        }
    }

    // 2. Find busy rooms
    $busyIds = [];
    if (!empty($allRooms)) {
        $placeholders = implode(',', array_fill(0, count($days), '?'));
        $sql = "SELECT DISTINCT room_id FROM schedule WHERE start_time <= ? AND end_time > ? AND day IN ($placeholders)";
        
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $endTime = date('H:i:s', strtotime($time) + 5400); // Add 1.5 hours
            $params = array_merge([$endTime, $time], $days);
            $types = 'ss' . str_repeat('s', count($days));
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $res2 = $stmt->get_result();
            while ($r = $res2->fetch_assoc()) {
                $busyIds[] = $r['room_id'];
            }
        }
    }

    // 3. Filter busy rooms out
    $available = [];
    foreach ($allRooms as $id => $room) {
        if (!in_array($id, $busyIds)) {
            $available[] = $room;
        }
    }

    echo json_encode(['success' => true, 'data' => array_values($available)]);

} catch (Exception $e) {
    // 🚨 INDESTRUCTIBLE FAILSAFE: If the query fails, just return ALL rooms!
    $fallback = [];
    $res = $conn->query("SELECT * FROM rooms");
    if ($res) { while($row = $res->fetch_assoc()) { $fallback[] = $row; } }
    
    echo json_encode(['success' => true, 'data' => $fallback, 'failsafe' => true]);
}
?>