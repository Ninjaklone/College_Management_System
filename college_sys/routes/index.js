var express = require('express');
var router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');


// In routes/login.js (set root)
// router.get('/', function(req, res, next) {
//     // Redirect to dashboard
//     res.redirect('/login');
// });
/* GET dashboard page. */
router.get('/dashboard', authMiddleware, function(req, res, next) {
    const userId = req.user.userId;

    // Fetch user details (keep existing query)
    db.query(`
        SELECT u.*, 
               COALESCE(s.first_name, f.first_name) AS first_name, 
               COALESCE(s.last_name, f.last_name) AS last_name,
               u.role
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE u.id = ?
    `, [userId], async (err, userResults) => {
        if (err) {
            return res.status(500).send('Error fetching user information');
        }

        const user = userResults[0];
        try {
            if (user.role === 'student') {
                // Fetch student's courses with homework assignments
                const [courses] = await db.promise().query(`
                    SELECT 
                        c.id AS course_id,
                        c.code, 
                        c.name, 
                        e.semester, 
                        e.year,
                        g.grade,
                        COALESCE(
                            NULLIF(
                                JSON_ARRAYAGG(
                                    IF(ch.id IS NOT NULL,
                                        JSON_OBJECT(
                                            'id', ch.id,
                                            'title', COALESCE(ch.title, ''),
                                            'description', COALESCE(ch.description, ''),
                                            'due_date', DATE_FORMAT(ch.due_date, '%Y-%m-%dT%H:%i:%s'),
                                            'submission_date', IF(sh.submission_date IS NOT NULL, 
                                                DATE_FORMAT(sh.submission_date, '%Y-%m-%dT%H:%i:%s'), 
                                                NULL),
                                            'status', COALESCE(sh.status, 'pending')
                                        ),
                                        NULL
                                    )
                                ),
                                '[null]'
                            ),
                            '[]'
                        ) as assignments
                    FROM enrollments e
                    JOIN courses c ON e.course_id = c.id
                    LEFT JOIN grades g ON g.enrollment_id = e.id
                    LEFT JOIN course_assignments ca ON ca.course_id = c.id 
                        AND ca.semester = e.semester 
                        AND ca.year = e.year
                    LEFT JOIN course_homework ch ON ch.course_assignment_id = ca.id
                    LEFT JOIN student_homework sh ON sh.homework_id = ch.id 
                        AND sh.student_id = (SELECT id FROM students WHERE user_id = ?)
                    WHERE e.student_id = (SELECT id FROM students WHERE user_id = ?)
                    GROUP BY c.id, c.code, c.name, e.semester, e.year, g.grade
                    ORDER BY e.year DESC, e.semester DESC
                `, [userId, userId]);

                // Debug log
                console.log('Raw courses data:', courses);

                // Process the assignments
                courses.forEach(course => {
                    try {
                        // Debug log
                        console.log(`Processing course ${course.code}, assignments:`, course.assignments);
                        
                        // Ensure we have a valid JSON string
                        if (!course.assignments || course.assignments === 'null' || course.assignments === '[null]') {
                            course.assignments = [];
                        } else {
                            const parsedAssignments = JSON.parse(course.assignments);
                            course.assignments = Array.isArray(parsedAssignments) 
                                ? parsedAssignments.filter(a => a !== null && a.id !== null) 
                                : [];
                        }
                    } catch (err) {
                        console.error(`Error parsing assignments for course ${course.code}:`, err);
                        console.error('Raw assignments data:', course.assignments);
                        course.assignments = [];
                    }
                });

                // Debug log
                console.log('Processed courses:', courses.map(c => ({
                    code: c.code,
                    assignmentsCount: c.assignments.length
                })));

                res.render('dashboard', {
                    title: 'Dashboard',
                    page: 'dashboard',
                    user: user,
                    courses: courses,
                    messages: req.flash()
                });

            } else if (user.role === 'faculty') {
                // Fetch faculty's course assignments
                const [courses] = await db.promise().query(`
                    SELECT 
                        ca.id AS course_assignment_id,
                        c.code, 
                        c.name, 
                        ca.semester, 
                        ca.year,
                        (
                            SELECT COUNT(DISTINCT e.student_id)
                            FROM enrollments e
                            WHERE e.course_id = c.id
                            AND e.semester = ca.semester
                            AND e.year = ca.year
                        ) as enrolled_students,
                        (
                            SELECT COUNT(*)
                            FROM course_homework ch
                            WHERE ch.course_assignment_id = ca.id
                        ) as homework_count
                    FROM course_assignments ca
                    JOIN courses c ON ca.course_id = c.id
                    WHERE ca.faculty_id = (SELECT id FROM faculty WHERE user_id = ?)
                    ORDER BY ca.year DESC, ca.semester
                `, [userId]);

                res.render('dashboard', {
                    title: 'Dashboard',
                    page: 'dashboard',
                    user: user,
                    courses: courses,
                    profilePic: '/images/profile_pic.png'
                });
            }
        } catch (err) {
            console.error('Dashboard error:', err);
            res.status(500).send('Error loading dashboard');
        }
    });
});

// Add new route for creating homework assignments
router.post('/create-homework', authMiddleware, async (req, res) => {
    // Debug logging
    console.log('Session:', req.session);
    console.log('User:', req.user);

    if (!req.user || req.session.role !== 'faculty') {
        console.log('Unauthorized access attempt - Role:', req.session.role);
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const { courseAssignmentId, title, description, dueDate } = req.body;
        
        // Verify that the faculty member is assigned to this course
        const [courseAssignment] = await db.promise().query(`
            SELECT ca.id 
            FROM course_assignments ca
            JOIN faculty f ON ca.faculty_id = f.id
            WHERE ca.id = ? AND f.user_id = ?
        `, [courseAssignmentId, req.session.userId]);

        if (courseAssignment.length === 0) {
            return res.status(403).json({ error: 'Unauthorized - Not assigned to this course' });
        }

        // Insert the homework assignment
        await db.promise().query(`
            INSERT INTO course_homework (course_assignment_id, title, description, due_date)
            VALUES (?, ?, ?, ?)
        `, [courseAssignmentId, title, description, dueDate]);

        req.flash('success', 'Homework assignment created successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Homework creation error:', err);
        req.flash('error', 'Error creating homework assignment');
        res.redirect('/dashboard');
    }
});

// Add logout route
router.get('/logout', function(req, res) {
    // Clear the session
    req.session.destroy(function(err) {
        if(err) {
            console.error('Logout error:', err);
            return res.status(500).send('Error during logout');
        }
        // Redirect to login page
        res.redirect('/login');
    });
});

// Root route handler
router.get('/', authMiddleware, (req, res) => {
    // Check role and redirect accordingly
    if (req.session.role === 'admin') {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/dashboard');
    }
});

module.exports = router;