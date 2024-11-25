const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyPassword } = require('../public/utils/passwordUtils');

// Secret key for JWT (store in environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET; // secret key for JWT (store in environment variable in production)

// Verify JWT_SECRET is set
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined');
    process.exit(1); // Exit the application if secret is not set
}
// Login Route
router.get('/', (req, res) => {
    res.render('login', { 
        title: 'Login', 
        error: null 
    });
});

router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Get user with role
        const [users] = await db.promise().query(
            'SELECT id, password, role FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        // Store user info in session
        req.session.userId = user.id;
        req.session.role = user.role;

        // Redirect based on role
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');  // Make sure this matches your route
        } else {
            return res.redirect('/dashboard');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/login');
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;