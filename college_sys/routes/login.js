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
    const { username, password } = req.body;

    try {
        // Fetch user by username
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        );

        if (users.length === 0) {
            return res.render('login', { 
                title: 'Login', 
                error: 'Invalid username or password' 
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            return res.render('login', { 
                title: 'Login', 
                error: 'Invalid username or password' 
            });
        }

        // Successful login logic (e.g., create session, redirect)
        req.session.userId = user.id;
        console.log('Session after login:', req.session);
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            title: 'Login', 
            error: 'An error occurred. Please try again.' 
        });
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;