const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Email Configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Server is ready to take our messages");
    }
});

// Serve static files from the React app
// Serve static files from the React app
const path = require('path');
const fs = require('fs');

// Check for local public folder (Production/Hostinger structure) or fallback to sibling directory (Dev)
const productionBuildPath = path.join(__dirname, 'public');
const devBuildPath = path.join(__dirname, '../frontend/build');

const buildPath = fs.existsSync(productionBuildPath) ? productionBuildPath : devBuildPath;

app.use(express.static(buildPath));

// Routes
app.get('/api', (req, res) => {
    res.send({ message: "API is working" });
});

app.post('/api/booking', async (req, res) => {
    console.log("Received booking request:", req.body);
    const { name, email, service, message } = req.body;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        return res.status(500).json({ detail: "SMTP credentials not configured" });
    }

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: "hello@themaplin.com",
        replyTo: email,
        subject: `New Booking Request from ${name}`,
        text: `
        New Booking Request Details:
        
        Name: ${name}
        Email: ${email}
        Service: ${service}
        
        Message:
        ${message}
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
        res.json({ message: "Booking request sent successfully" });
    } catch (error) {
        console.error("Error sending email:", error);
        const fs = require('fs');
        try {
            fs.appendFileSync('backend_error.log', `${new Date().toISOString()} - Error: ${error.message}\n${JSON.stringify(error)}\n`);
        } catch (logErr) {
            console.error("Could not write to log file:", logErr);
        }
        res.status(500).json({ detail: `Error sending email: ${error.message}` });
    }
});

app.post('/api/contact', async (req, res) => {
    console.log("Received contact request:", req.body);
    const { name, email, subject, message } = req.body;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        return res.status(500).json({ detail: "SMTP credentials not configured" });
    }

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: "hello@themaplin.com",
        replyTo: email,
        subject: `New Contact Inquiry: ${subject || 'General Inquiry'}`,
        text: `
        New Contact Inquiry Details:
        
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Contact email sent successfully");
        res.json({ message: "Contact request sent successfully" });
    } catch (error) {
        console.error("Error sending contact email:", error);
        const fs = require('fs');
        try {
            fs.appendFileSync('backend_error.log', `${new Date().toISOString()} - Contact Error: ${error.message}\n${JSON.stringify(error)}\n`);
        } catch (logErr) {
            console.error("Could not write to log file:", logErr);
        }
        res.status(500).json({ detail: `Error sending email: ${error.message}` });
    }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
