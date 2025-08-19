require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());  // Allow all origins during development
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'student-registration-db.cy5e4eiyes88.us-east-1.rds.amazonaws.com',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin159357',
    database: process.env.DB_NAME || 'student_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
}
testConnection();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/register', async (req, res) => {
    console.log('📥 Received registration data:', req.body);

    try {
        const { name, email, age, nationality, student_id, school, degree, year_of_admission, languages } = req.body;

        // Basic validation
        if (!name || !email || !student_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Name, email, and student ID are required'
            });
        }

        // Insert into database
        const [result] = await pool.execute(
            `INSERT INTO registrations 
            (name, email, age, nationality, student_id, school, degree, year_of_admission, languages) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, age, nationality, student_id, school, degree, year_of_admission, languages]
        );

        console.log('✅ Registration inserted with ID:', result.insertId);
        
        res.json({
            success: true,
            message: 'Registration successful!',
            studentId: student_id
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        
        // Handle duplicate entry for student_id or email
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Student ID or email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Database operation failed',
            error: err.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});