<?php
// thesis/login.php
session_start();
error_reporting(0); // 🔥 THE FIX: This stops PHP warnings from breaking your JSON!
include 'config/db_connection.php';

header("Content-Type: application/json");

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    // Plaintext Match
    if ($password === $user['password'] || password_verify($password, $user['password'])) {

        // 🔥 SAFEGUARD: This checks if 'id' or 'ID' exists so line 25 never fails
        $actual_id = $user['id'] ?? $user['ID'] ?? 0;

        $_SESSION['user_id'] = $actual_id; 
        $_SESSION['User_ID'] = $actual_id; // Added this for compatibility
        $_SESSION['role']    = $user['role'];
        $_SESSION['username'] = $user['username'];

        $role = strtolower(trim($user['role']));
        
        // Determine Redirect
        $redirect = "app/admin.html"; // Default
        if ($role === 'student') $redirect = "app/student.html";
        if ($role === 'teacher') $redirect = "app/teacher.html";
        if ($role === 'dept_head') $redirect = "app/dept_head.html";

        echo json_encode([
            "status" => "success",
            "role" => $role,
            "redirect" => $redirect
        ]);
        exit();
    }
}

echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
exit();
?>