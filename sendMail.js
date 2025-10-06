import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());
app.use(cors());

// Dummy users data (replace with DB fetch in production)
// Import and initialize Supabase client

const supabaseUrl = 'https://ublzlmubbovanvxvcbws.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibHpsbXViYm92YW52eHZjYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDE3MzYsImV4cCI6MjA3NTE3NzczNn0.qjvhh9QovyEIMNGLMSHWfTLhFEB138XoebFn8T8E6h0';       // Replace with your Supabase key
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to fetch users from Supabase
async function getUsers() {
    const { data, error } = await supabase
        .from('profiles') // Replace with your table name
        .select('id, email, temp_password');
    if (error) throw error;
    return data;
}

// Configure your SMTP transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'guymight719@gmail.com',      // Replace with your email
        pass: 'pirmbckzaciqikck',   // Use App Password if 2FA enabled
    },
});

app.post('/api/send-mails', async (req, res) => {
    try {
        const users = await getUsers();
        console.log('Fetched users:', users);
        for (const user of users) {
            console.log('Sending mail to:', user.email);
            await transporter.sendMail({
                from: '"IntelliQuiz" <guymight719@gmail.com>', // Use your actual email
                to: user.email,
                subject: 'Your IntelliQuiz Account Details',
                text: `Hello ${user.email},\n\nYour User ID: ${user.id}\nTemporary Password: ${user.temp_password}\n\nPlease login and change your password.`,
            });
        }
        res.json({ success: true, message: 'Emails sent to all users.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send emails.' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Mail backend running on http://localhost:${PORT}`);
});