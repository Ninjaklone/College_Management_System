// routes/register.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword } = require('../public/utils/passwordUtils'); // Import the hash function

// Registration Route
router.get('/', (req, res) => {
    res.render('register', { 
        title: 'Register', 
        error: null 
    });
});

router.post('/', async (req, res) => {
    const { username, password, email, role } = req.body;

    try {
        // Hash the password before storing it
        const hashedPassword = await hashPassword(password);

        const query = 'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)';
        
        db.query(query, [username, hashedPassword, email, role], (err, result) => {
            if (err) {
                console.error('Registration Error:', err);
                return res.render('register', { 
                    title: 'Register', 
                    error: 'Registration failed' 
                });
            }

            res.redirect('/login'); // Redirect to login after successful registration
        });
    } catch (error) {
        console.error('Registration Process Error:', error);
        res.render('register', { 
            title: 'Register', 
            error: 'An unexpected error occurred' 
        });
    }
});

module.exports = router;