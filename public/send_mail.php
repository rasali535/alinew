<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit();
    }
    
    $name = strip_tags($data['name'] ?? 'Unknown');
    $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $subject = strip_tags($data['subject'] ?? 'Website Inquiry');
    $message = strip_tags($data['message'] ?? '');
    $service = strip_tags($data['service'] ?? '');
    
    if (!$email) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid email is required']);
        exit();
    }
    
    $to = 'hello@themaplin.com';
    $email_subject = $service ? "Booking Request: $service - from $name" : "New Inquiry: $subject - from $name";
    
    $email_body = "You have received a new message from your website contact form.\n\n".
                  "Name: $name\n".
                  "Email: $email\n";
    
    if ($service) {
        $email_body .= "Service: $service\n";
    } else {
        $email_body .= "Subject: $subject\n";
    }
    
    $email_body .= "\nMessage:\n$message\n";
    
    $headers = "From: noreply@themaplin.com\n"; // Best to use a domain email
    $headers .= "Reply-To: $email";
    
    if (mail($to, $email_subject, $email_body, $headers)) {
        echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server failed to send email.']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
