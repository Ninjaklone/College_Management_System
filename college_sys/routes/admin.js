const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

// Admin dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        // Basic stats query
        const [[stats]] = await db.promise().query(`
            SELECT 
                (SELECT COUNT(*) FROM students) as totalStudents,
                (SELECT COUNT(*) FROM faculty) as totalFaculty,
                (SELECT COUNT(*) FROM courses) as activeCourses
        `);

        // Get users list
        const [users] = await db.promise().query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.role,
                COALESCE(s.first_name, f.first_name) as first_name,
                COALESCE(s.last_name, f.last_name) as last_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN faculty f ON u.id = f.user_id
            ORDER BY u.role, u.username
        `);

        // Render the admin dashboard
        res.render('admin_dashboard', {
            title: 'Admin Dashboard',
            user: {
                userId: req.session.userId,
                role: req.session.role
            },
            users: users,
            stats: stats,
            messages: req.flash()
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/login');
    }
});

// Create new user
router.post('/users/create', authMiddleware, async (req, res) => {
    try {
        const { username, email, password, role, firstName, lastName } = req.body;
        
        // Start transaction
        await db.promise().beginTransaction();

        // Create user
        const [result] = await db.promise().query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, password, role]
        );

        const userId = result.insertId;

        // Create role-specific record
        if (role === 'student') {
            await db.promise().query(
                'INSERT INTO students (user_id, first_name, last_name) VALUES (?, ?, ?)',
                [userId, firstName, lastName]
            );
        } else if (role === 'faculty') {
            await db.promise().query(
                'INSERT INTO faculty (user_id, first_name, last_name) VALUES (?, ?, ?)',
                [userId, firstName, lastName]
            );
        }

        await db.promise().commit();
        req.flash('success', 'User created successfully');
    } catch (err) {
        await db.promise().rollback();
        console.error('User creation error:', err);
        req.flash('error', 'Error creating user');
    }
    
    res.redirect('/admin/dashboard');
});

// Toggle user status
router.post('/users/:id/toggle-status', authMiddleware, async (req, res) => {
    try {
        await db.promise().query(
            'UPDATE users SET active = NOT active WHERE id = ?',
            [req.params.id]
        );
        req.flash('success', 'User status updated successfully');
    } catch (err) {
        console.error('User status update error:', err);
        req.flash('error', 'Error updating user status');
    }
    res.redirect('/admin/dashboard');
});

module.exports = router; 