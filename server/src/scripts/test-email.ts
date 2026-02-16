import { emailService } from '../services/emailService.js';

async function testEmail() {
    console.log('Testing Email Service with Hostinger SMTP...');
    try {
        await emailService.sendLeadNotification({
            name: 'Test Tester',
            email: 'tester@example.com',
            phone: '123456789',
            source: 'test_script_dry_run'
        });
        console.log('✓ Email notification sent successfully to hello@themaplin.com');
    } catch (error) {
        console.error('Email Failed:', error.message);
    }
}

testEmail();
