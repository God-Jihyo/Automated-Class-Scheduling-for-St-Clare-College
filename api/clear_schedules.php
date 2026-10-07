<?php
// thesis/api/clear_schedules.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../config/db_connection.php';

echo "<h2>Clearing all generated schedules...</h2>";

// TRUNCATE completely empties the table AND resets the ID numbers back to 1
$sql = "TRUNCATE TABLE schedule";

if ($conn->query($sql)) {
    echo "<h3 style='color: green;'>✅ Successfully deleted ALL schedules! Your schedule table is now completely blank.</h3>";
} else {
    echo "<h3 style='color: red;'>⚠️ Error clearing schedules: " . $conn->error . "</h3>";
}

echo "<p><strong>You can now close this tab and run the Auto-Scheduler again!</strong></p>";

$conn->close();
?>