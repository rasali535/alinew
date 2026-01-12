import smtplib
from email.mime.text import MIMEText
import os
import sys

# Hardcoded for test
SMTP_HOST = "smtp.titan.email"
SMTP_PORT = 465
SMTP_USER = "hello@themaplin.com"
SMTP_PASSWORD = "P@ssword202e"
RECEIVER = "hello@themaplin.com"

print(f"Python version: {sys.version}")
print(f"Testing SMTP connection to {SMTP_HOST}:{SMTP_PORT} as {SMTP_USER}")

try:
    print("Connecting...")
    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
    print("Connected. EHLO...")
    server.ehlo()
    print("Logging in...")
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("Logged in successfully.")
    
    msg = MIMEText("This is a test email")
    msg['Subject'] = "SMTP Config Test"
    msg['From'] = SMTP_USER
    msg['To'] = RECEIVER
    
    print("Sending email...")
    server.sendmail(SMTP_USER, RECEIVER, msg.as_string())
    server.quit()
    print("SUCCESS: Email sent.")
except Exception as e:
    print(f"ERROR: {e}")
    # Print type of error
    print(f"Error Type: {type(e)}")
