const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const bcrypt = require('bcrypt');

// Admin dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        // First, get admin user info
        const [[adminUser]] = await db.promise().query(`
            SELECT 
                u.id,
                u.username,
                COALESCE(s.first_name, f.first_name) as first_name,
                COALESCE(s.last_name, f.last_name) as last_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN faculty f ON u.id = f.user_id
            WHERE u.id = ?
        `, [req.session.userId]);

        // Get recent logins
        const [recentLogins] = await db.promise().query(`
            SELECT 
                u.username,
                u.last_login,
                u.active,
                COALESCE(s.first_name, f.first_name) as first_name,
                COALESCE(s.last_name, f.last_name) as last_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN faculty f ON u.id = f.user_id
            WHERE u.last_login IS NOT NULL
            ORDER BY u.last_login DESC
            LIMIT 5
        `);

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
                u.active,
                COALESCE(s.first_name, f.first_name) as first_name,
                COALESCE(s.last_name, f.last_name) as last_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN faculty f ON u.id = f.user_id
            ORDER BY u.role, u.username
        `);

        // System stats
        const [[systemStats]] = await db.promise().query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE active = true) as active_users,
                (SELECT COUNT(*) FROM courses WHERE semester = 'CURRENT_SEMESTER') as current_courses,
                (SELECT COUNT(*) FROM enrollments WHERE status = 'pending') as pending_enrollments
        `);

        // Updated departments query
        const [departments] = await db.promise().query(`
            SELECT 
                DISTINCT c.department,
                (SELECT COUNT(*) FROM students s WHERE s.department = c.department) as student_count,
                (SELECT COUNT(*) FROM courses co WHERE co.department = c.department) as course_count
            FROM courses c
            WHERE c.department IS NOT NULL
        `);

        res.render('admin_dashboard', {
            title: 'Admin Dashboard',
            user: {
                userId: req.session.userId,
                role: req.session.role,
                name: `${adminUser.first_name} ${adminUser.last_name}`,
                first_name: adminUser.first_name,  // Add this for navbar
                last_name: adminUser.last_name     // Add this for navbar
            },
            users: users,
            stats: stats,
            systemStats: systemStats,
            recentLogins: recentLogins,
            departments: departments,  // Add this
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

// 4. Reset User Password
router.post('/users/:id/reset-password', authMiddleware, async (req, res) => {
    try {
        const defaultPassword = '12345678';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        await db.promise().query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.params.id]
        );

        req.flash('success', 'Password has been reset');
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Password reset error:', err);
        req.flash('error', 'Error resetting password');
        res.redirect('/admin/dashboard');
    }
});

// 5. Bulk User Status Update
router.post('/users/bulk-status', authMiddleware, async (req, res) => {
    try {
        const { userIds, status } = req.body;
        await db.promise().query(
            'UPDATE users SET active = ? WHERE id IN (?)',
            [status === 'activate', userIds]
        );

        req.flash('success', 'Users status updated successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Bulk status update error:', err);
        req.flash('error', 'Error updating users status');
        res.redirect('/admin/dashboard');
    }
});

module.exports = router; 