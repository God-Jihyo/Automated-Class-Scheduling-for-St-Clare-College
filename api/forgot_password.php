<?php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json');

register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'FATAL CRASH: ' . $err['message'] . ' on line ' . $err['line']
        ]);
    }
});

session_start();

try {
    require_once '../config/db_connection.php'; 

    require_once '../vendor/phpmailer/src/Exception.php';
    require_once '../vendor/phpmailer/src/PHPMailer.php';
    require_once '../vendor/phpmailer/src/SMTP.php';

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        $email = trim($_POST['email'] ?? '');

        if (empty($email)) {
            echo json_encode(['status' => 'error', 'message' => 'Email is required.']);
            exit;
        }

        $stmt = $conn->prepare("SELECT ID FROM users WHERE username = ? LIMIT 1"); 
        
        if (!$stmt) {
            echo json_encode(['status' => 'error', 'message' => 'DB Error: ' . $conn->error]);
            exit;
        }

        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();

        if (!$user) {
            echo json_encode(['status' => 'success', 'message' => 'If that email is registered, a reset link has been sent.']);
            exit;
        }

        $actual_id = $user['ID'];
        $token = bin2hex(random_bytes(32));
        
        // THE FIX: Create a strict integer timestamp for 30 minutes from now
        $expires = time() + 1800; 
        
        $updateStmt = $conn->prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE ID = ?");
        // 'sii' = String (token), Integer (expires), Integer (id)
        $updateStmt->bind_param("sii", $token, $expires, $actual_id);
        
        if (!$updateStmt->execute()) {
            echo json_encode(['status' => 'error', 'message' => 'DB Update Error: ' . $updateStmt->error]);
            exit;
        }

        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com'; 
        $mail->SMTPAuth   = true;
        $mail->Username   = 'kendricksean8103@gmail.com'; 
        $mail->Password   = 'tsyn lfot ftwh vowd';    
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('no-reply@stclare.edu.ph', 'SCC System Admin');
        $mail->addAddress($email);

        $resetLink = "http://thesis.test/reset_password.php?token=" . $token;

        $mail->isHTML(true);
        $mail->Subject = 'Password Reset Request - SCC System';
        $mail->Body    = "
            <h3>Password Reset Request</h3>
            <p>We received a request to reset your password for the SCC Automated Class Scheduling System.</p>
            <p>Click the link below to set a new password. This link is valid for 30 minutes.</p>
            <br>
            <a href='{$resetLink}' style='padding: 10px 20px; background-color: #ff3333; color: white; text-decoration: none; border-radius: 5px;'>Reset Password</a>
            <br><br>
            <p>If you did not request this, please ignore this email.</p>
        ";

        $mail->send();
        echo json_encode(['status' => 'success', 'message' => 'If that email is registered, a reset link has been sent.']);
    }
} catch (\Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => 'SYSTEM EXCEPTION: ' . $e->getMessage()]);
}
?>