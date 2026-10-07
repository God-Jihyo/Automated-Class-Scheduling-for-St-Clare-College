<?php
session_start();
require_once 'config/db_connection.php'; 

$error = '';
$success = '';
$token = $_GET['token'] ?? '';
$user = null;

if (empty($token)) {
    $error = 'Invalid or missing password reset token.';
} else {
    // 1. Compare the stored expiration integer against the current time integer
    $current_time = time();
    $stmt = $conn->prepare("SELECT ID FROM users WHERE reset_token = ? AND reset_expires > ? LIMIT 1");
    $stmt->bind_param("si", $token, $current_time);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if (!$user) {
        $error = 'This password reset link is invalid or has expired. Please request a new one from the login page.';
    }
}

// 2. Handle the Form Submission
if ($_SERVER["REQUEST_METHOD"] == "POST" && $user) {
    $new_password = $_POST['new_password'];
    $confirm_password = $_POST['confirm_password'];

    if (empty($new_password) || empty($confirm_password)) {
        $error = 'Please fill out both password fields.';
    } elseif ($new_password !== $confirm_password) {
        $error = 'Passwords do not match.';
    } else {
        $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
        $actual_id = $user['ID'];

        // Update password and clear tokens
        $updateStmt = $conn->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE ID = ?");
        $updateStmt->bind_param("si", $hashed_password, $actual_id);
        
        if ($updateStmt->execute()) {
            $success = 'Your password has been successfully reset. You can now login.';
            $user = null; 
        } else {
            $error = 'Database error. Please try again.';
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - SCC</title>
    <link rel="stylesheet" href="login.css"> 
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        .message-box { padding: 10px; margin-bottom: 15px; border-radius: 5px; font-size: 13px; text-align: center; }
        .error { background-color: #ffe6e6; color: #cc0000; border: 1px solid #cc0000; }
        .success { background-color: #e6ffe6; color: #008000; border: 1px solid #008000; }
    </style>
</head>
<body>

<div class="main-container" style="width: 450px; height: auto; padding: 40px;">
    <div class="login-box" style="margin: 0 auto;">
        <img src="./assets/images/sccicon.png" alt="St. Clare Logo" class="college-logo">
        <h2>RESET PASSWORD</h2>

        <?php if (!empty($error)): ?>
            <div class="message-box error"><?php echo htmlspecialchars($error); ?></div>
            <a href="login.html" class="login-btn" style="display: block; text-decoration: none; text-align: center; padding-top: 10px;">GO TO LOGIN</a>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="message-box success"><?php echo htmlspecialchars($success); ?></div>
            <a href="login.html" class="login-btn" style="display: block; text-decoration: none; text-align: center; padding-top: 10px;">GO TO LOGIN</a>
        <?php endif; ?>

        <?php if ($user && empty($success)): ?>
            <form method="POST" action="">
                <div class="input-group">
                    <input type="password" id="new_password" name="new_password" placeholder="New Password" required>
                    <i class="fa fa-eye-slash toggle-password" data-target="new_password" title="Toggle Visibility"></i>
                </div>
                
                <div class="input-group">
                    <input type="password" id="confirm_password" name="confirm_password" placeholder="Confirm Password" required>
                    <i class="fa fa-eye-slash toggle-password" data-target="confirm_password" title="Toggle Visibility"></i>
                </div>
                
                <button type="submit" class="login-btn">SAVE NEW PASSWORD</button>
            </form>
        <?php endif; ?>

    </div>
</div>

<script>
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function () {
            const targetInput = document.getElementById(this.getAttribute('data-target'));
            const type = targetInput.getAttribute('type') === 'password' ? 'text' : 'password';
            targetInput.setAttribute('type', type);
            
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('fa-eye');
        });
    });
</script>

</body>
</html>