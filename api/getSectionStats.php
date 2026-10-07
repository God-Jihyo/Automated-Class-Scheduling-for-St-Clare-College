<?php
// thesis/api/getSectionStats.php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
    require_once '../config/db_connection.php';

    $total = 0;
    $completed = 0;

    // 1. Instantly count the total sections
    $tQ = $conn->query("SELECT COUNT(*) as c FROM sections");
    if ($tQ && $row = $tQ->fetch_assoc()) {
        $total = (int)$row['c'];
    }

    // 2. Safely scan the sections to find the completed ones!
    $sQ = $conn->query("SELECT * FROM sections");
    if ($sQ) {
        while ($sec = $sQ->fetch_assoc()) {
            $statusText = strtolower($sec['schedule_status_text'] ?? $sec['schedule_status'] ?? $sec['status'] ?? '');
            $scheduled = (float)($sec['scheduled_hours'] ?? 0);
            $required = (float)($sec['total_hours'] ?? $sec['required_hours'] ?? 0);

            // If the text says complete, OR the hours match the requirement, count it!
            if (strpos($statusText, 'complete') !== false || ($required > 0 && $scheduled >= $required)) {
                $completed++;
            }
        }
    }

    echo json_encode(['success' => true, 'total' => $total, 'completed' => $completed]);

} catch (Throwable $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>