var express = require('express');
var router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, async function(req, res, next) {
    try {
        // First get the user details
        const [userResults] = await db.promise().query(`
            SELECT u.*, 
                   COALESCE(s.first_name, f.first_name) AS first_name, 
                   COALESCE(s.last_name, f.last_name) AS last_name,
                   u.role
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN faculty f ON u.id = f.user_id
            WHERE u.id = ?
        `, [req.user.userId]);

        const user = userResults[0];

        // Then get the courses
        let coursesQuery = `
            SELECT 
                c.*,
                ${user.role === 'student' ? `
                    EXISTS(
                        SELECT 1 
                        FROM enrollments e 
                        WHERE e.course_id = c.id 
                        AND e.student_id = (SELECT id FROM students WHERE user_id = ?)
                    ) as is_enrolled
                ` : 'FALSE as is_enrolled'}
            FROM courses c
            ORDER BY c.code
        `;

        const [courses] = await db.promise().query(
            coursesQuery, 
            user.role === 'student' ? [req.user.userId] : []
        );

        res.render('course_list', {
            title: 'Course List',
            courses: courses,
            user: user,
            messages: req.flash()
        });
    } catch (err) {
        console.error('Error fetching courses:', err);
        req.flash('error', 'Error loading courses');
        res.redirect('/dashboard');
    }
});

// Add course creation route
router.post('/create', authMiddleware, async (req, res) => {
    if (!req.user || req.user.role !== 'faculty') {
        req.flash('error', 'Unauthorized access');
        return res.redirect('/course_list');
    }

    try {
        const { code, name, credits, department } = req.body;
        
        // Check if course code already exists
        const [existingCourse] = await db.promise().query(
            'SELECT id FROM courses WHERE code = ?',
            [code]
        );

        if (existingCourse.length > 0) {
            req.flash('error', 'Course code already exists');
            return res.redirect('/course_list');
        }

        // Insert new course
        await db.promise().query(
            'INSERT INTO courses (code, name, credits, department) VALUES (?, ?, ?, ?)',
            [code, name, credits, department]
        );

        req.flash('success', 'Course created successfully');
        res.redirect('/course_list');
    } catch (err) {
        console.error('Course creation error:', err);
        req.flash('error', 'Error creating course');
        res.redirect('/course_list');
    }
});

module.exports = router;