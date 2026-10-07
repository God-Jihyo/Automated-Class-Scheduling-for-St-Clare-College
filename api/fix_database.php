<?php
// thesis/api/fix_database.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../config/db_connection.php';

echo "<h2>Fixing Database for Modern Events...</h2>";

// 1. Add the Poster column
$sql1 = "ALTER TABLE room_reservations ADD COLUMN poster_url VARCHAR(255) NULL";
if ($conn->query($sql1)) {
    echo "✅ Added 'poster_url' column successfully!<br>";
} else {
    echo "⚠️ Note on poster_url: " . $conn->error . "<br>";
}

// 2. Add the Announcement column
$sql2 = "ALTER TABLE room_reservations ADD COLUMN announcement TEXT NULL";
if ($conn->query($sql2)) {
    echo "✅ Added 'announcement' column successfully!<br>";
} else {
    echo "⚠️ Note on announcement: " . $conn->error . "<br>";
}

echo "<br><h3 style='color:green;'>All done! You can close this tab and go add your events now!</h3>";
?>