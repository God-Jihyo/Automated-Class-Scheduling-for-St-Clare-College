<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Adjust these paths to where you actually placed the PHPMailer folder
require '../vendor/phpmailer/src/Exception.php';
require '../vendor/phpmailer/src/PHPMailer.php';
require '../vendor/phpmailer/src/SMTP.php';

function sendCredentials($recipientEmail, $recipientName, $plainPassword, $role) {
    $mail = new PHPMailer(true);

    try {
        //Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'YOUR EMAIL'; 
        $mail->Password   = 'YOUR PASSWORD';    
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // FIX 1: Bypass local SSL certificate verification
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );

        // FIX 2: The 'From' address MUST match the Username exactly
        $mail->setFrom('kendricksean8103@gmail.com', 'St. Clare Scheduling Admin');
        $mail->addAddress($recipientEmail, $recipientName);

        //Content
        $mail->isHTML(true);
        $mail->Subject = 'Your Account Credentials - St. Clare College';
        $mail->Body    = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h3 style='color: #c83b3b;'>Welcome to St. Clare College Scheduling System</h3>
                <p>Dear $recipientName,</p>
                <p>Your account (<strong>$role</strong>) has been successfully created.</p>
                <div style='background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;'>
                    <p style='margin: 5px 0;'><strong>Username:</strong> $recipientEmail</p>
                    <p style='margin: 5px 0;'><strong>Password:</strong> $plainPassword</p>
                </div>
                <p>Please login and change your password immediately.</p>
                <br>
                <p>Regards,<br><strong>System Administrator</strong></p>
            </div>
        ";

        $mail->send();
        return true;
    } catch (Exception $e) {
        // Log the exact error to your PHP error log so you can track it if it fails again
        error_log("PHPMailer Error: {$mail->ErrorInfo}");
        return false; 
    }
}
?>