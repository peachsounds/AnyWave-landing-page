// Simple Node.js/Express backend for sending early access emails
// Install dependencies: npm install express nodemailer dotenv

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Your download link
const DOWNLOAD_LINK = process.env.DOWNLOAD_LINK || 'https://your-domain.com/downloads/AnyWave.dmg';

// Email configuration (using Gmail as example)
// For production, use SendGrid, Mailgun, or AWS SES
const transporter = nodemailer.createTransport({
    service: 'gmail', // or use SMTP settings
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Use app-specific password for Gmail
    }
});

// Store emails (in production, use a database)
let emailCount = 200; // Starting count
const submittedEmails = new Set();

app.post('/api/early-access', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email' });
    }
    
    // Check if already submitted
    if (submittedEmails.has(email)) {
        return res.json({ 
            success: true, 
            message: 'Email already registered',
            remaining: emailCount 
        });
    }
    
    // Decrement count
    if (emailCount > 0) {
        emailCount--;
    }
    
    submittedEmails.add(email);
    
    // Send email
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your AnyWave Early Access',
            html: `
                <h2>Welcome to AnyWave Beta!</h2>
                <p>Thank you for joining our early access program.</p>
                <p>Click the link below to download:</p>
                <p><a href="${DOWNLOAD_LINK}" style="background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Download AnyWave</a></p>
                <p>If the button doesn't work, copy and paste this link:</p>
                <p>${DOWNLOAD_LINK}</p>
                <p>Best regards,<br>The PeachSounds Team</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true, 
            message: 'Email sent successfully',
            remaining: emailCount 
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Get remaining count
app.get('/api/count', (req, res) => {
    res.json({ remaining: emailCount });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

