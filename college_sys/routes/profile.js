var express = require('express');
var router = express.Router();
const db = require('../db');

// Get profile
router.get('/', function(req, res, next) {
    // Replace with actual user ID from session
    const userId = 1;

    db.query(`
        SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.role,
            COALESCE(s.first_name, f.first_name) AS first_name, 
            COALESCE(s.last_name, f.last_name) AS last_name,
            COALESCE(s.phone, '') AS phone,
            COALESCE(s.address, '') AS address,
            COALESCE(s.date_of_birth, NULL) AS date_of_birth,
            COALESCE(f.department, '') AS department
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE u.id = ?
    `, [userId], (err, userResults) => {
        if (err) {
            console.error('Profile fetch error:', err);
            return res.status(500).send('Error fetching profile information');
        }

        if (userResults.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = userResults[0];
        res.render('profile', {
            title: 'Profile',
            page: 'profile',
            user: user,
            profilePic: '/Images/profile_pic.png'
        });
    });
});

// Update profile
router.post('/', function(req, res, next) {
    // Replace with actual user ID from session
    const userId = 1;

    // Destructure form data
    const { 
        first_name, 
        last_name, 
        email, 
        phone, 
        address, 
        date_of_birth,
        department 
    } = req.body;

    // Start a transaction to ensure data consistency
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).send('Error starting transaction');
        }

        // First, update user email
        db.query(`
            UPDATE users 
            SET email = ? 
            WHERE id = ?
        `, [email, userId], (err, userUpdateResult) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).send('Error updating user email');
                });
            }

            // Then, update student or faculty details based on role
            const updateQuery = userId.role === 'student' 
                ? `
                    UPDATE students 
                    SET 
                        first_name = ?, 
                        last_name = ?, 
                        phone = ?, 
                        address = ?, 
                        date_of_birth = ?
                    WHERE user_id = ?
                `
                : `
                    UPDATE faculty 
                    SET 
                        first_name = ?, 
                        last_name = ?, 
                        department = ?
                    WHERE user_id = ?
                `;

            const updateParams = userId.role === 'student'
                ? [first_name, last_name, phone, address, date_of_birth, userId]
                : [first_name, last_name, department, userId];

            db.query(updateQuery, updateParams, (err, detailUpdateResult) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).send('Error updating profile details');
                    });
                }

                // Commit the transaction
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).send('Error committing transaction');
                        });
                    }
                    res.redirect('/profile');
                });
            });
        });
    });
});

module.exports = router;