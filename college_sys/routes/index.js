var express = require('express');
var router = express.Router();
const db = require('../db');


/* GET dashboard page. */
router.get('/dashboard', function(req, res, next) {
  
    // Replace this with session-based authentication later)
    const userId = 1; // This should come from the user's session

    // Fetch user details
    db.query(`
        SELECT u.*, 
               COALESCE(s.first_name, f.first_name) AS first_name, 
               COALESCE(s.last_name, f.last_name) AS last_name,
               u.role
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE u.id = ?
    `, [userId], (err, userResults) => {
        if (err) {
            return res.status(500).send('Error fetching user information');
        }

        const user = userResults[0];
        console.log("This is the user:", user);

        // Fetch upcoming classes and grades based on user role
        if (user.role === 'student') {
            // For students, fetch enrolled courses and grades
            db.query(`
                SELECT 
                    c.code, 
                    c.name, 
                    e.semester, 
                    e.year,
                    g.grade
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN grades g ON g.enrollment_id = e.id
                WHERE e.student_id = (SELECT id FROM students WHERE user_id = ?)
                ORDER BY e.year DESC, e.semester
            `, [userId], (err, coursesResults) => {
                if (err) {
                    return res.status(500).send('Error fetching enrolled courses');
                }

                res.render('dashboard', {
                    title: 'Dashboard',
                    page: 'dashboard',
                    user: user,
                    courses: coursesResults,
                    profilePic: '/Images/profile_pic.png'
                });
            });
        } else if (user.role === 'faculty') {
            // For faculty, fetch assigned courses
            db.query(`
                SELECT 
                    c.code, 
                    c.name, 
                    ca.semester, 
                    ca.year
                FROM course_assignments ca
                JOIN courses c ON ca.course_id = c.id
                WHERE ca.faculty_id = (SELECT id FROM faculty WHERE user_id = ?)
                ORDER BY ca.year DESC, ca.semester
            `, [userId], (err, coursesResults) => {
                if (err) {
                    return res.status(500).send('Error fetching assigned courses');
                }

                res.render('dashboard', {
                    title: 'Dashboard',
                    page: 'dashboard',
                    user: user,
                    courses: coursesResults,
                    profilePic: '/Images/profile_pic.png'
                });
            });
        } else {
            // For admin or other roles
            res.render('dashboard', {
                title: 'Dashboard',
                page: 'dashboard',
                user: user,
                courses: [],
                profilePic: '/Images/profile_pic.png'
            });
        }
    });
});



module.exports = router;