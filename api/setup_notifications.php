<?php
// api/setup_notifications.php

error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../config/db_connection.php';

// Create the smart Notifications table
$sql = "CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'>";
    echo "<h1 style='color: #10b981;'>✅ Notifications Engine Installed!</h1>";
    echo "<p style='color: #64748b;'>The database table is ready. You can close this tab and go back to your code.</p>";
    echo "</div>";
} else {
    echo "<h2 style='color: red;'>❌ Error: " . $conn->error . "</h2>";
}

$conn->close();
?>