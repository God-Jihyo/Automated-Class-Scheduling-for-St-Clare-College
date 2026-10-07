<?php
$host = "sql308.infinityfree.com";
$user = "YOUR USERNAME";
$pass = "YOUR PASSWORD";
$db   = "YOUR DATABASE NAME";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>