var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        // Check if user is logged in
        if (req.session.userId) {
            // Update user status to inactive
            await db.promise().query(
                'UPDATE users SET active = ? WHERE id = ?',
                [false, req.session.userId]
            );

            console.log('User logged out:', req.session.userId); // Debug log
        }

        // Destroy the session after database update
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            res.redirect('/login');
        });

    } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, attempt to redirect to login
        res.redirect('/login');
    }
});

router.post('/', async (req, res) => {
    try {
        if (req.session.userId) {
            await db.promise().query(
                'UPDATE users SET active = ? WHERE id = ?',
                [false, req.session.userId]
            );

            console.log('User logged out:', req.session.userId); // Debug log
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            res.redirect('/login');
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/login');
    }
});

module.exports = router; 