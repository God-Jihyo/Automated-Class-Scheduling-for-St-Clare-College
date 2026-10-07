<?php
include '../config/db_connection.php';

// This command instantly empties the schedule table and resets its IDs
$sql = "TRUNCATE TABLE schedule";

if ($conn->query($sql) === TRUE) {
    echo "<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'>";
    echo "<h1 style='color: #28a745;'>✅ Database Successfully Cleaned!</h1>";
    echo "<p>All 60,000+ corrupted ghost schedules have been completely vaporized.</p>";
    echo "<p>Your system is now safe. You can close this tab and go back to your dashboard.</p>";
    echo "</div>";
} else {
    echo "Error cleaning database: " . $conn->error;
}

$conn->close();
?>