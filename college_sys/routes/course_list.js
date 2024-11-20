var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', function(req, res, next) {
    // Replace with actual user ID and role from session
    const userId = 1;
    const userRole = 'student';

    if (userRole === 'student') {
        // Fetch courses student can enroll in
        db.query(`
            SELECT c.* 
            FROM courses c
            LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = (SELECT id FROM students WHERE user_id = ?)
            WHERE e.id IS NULL
        `, [userId], (err, courses) => {
            if (err) {
                return res.status(500).send('Error fetching courses');
            }
            res.render('course_list', {
                title: 'Course List',
                page: 'course_list',
                courses: courses,
                userRole: userRole
            });
        });
    } else if (userRole === 'faculty') {
        // Fetch all courses for faculty
        db.query('SELECT * FROM courses', (err, courses) => {
            if (err) {
                return res.status(500).send('Error fetching courses');
            }
            res.render('course_list', {
                title: 'Course List',
                page: 'course_list',
                courses: courses,
                userRole: userRole
            });
        });
    } else {
        res.status(403).send('Unauthorized');
    }
});

router.post('/enroll', function(req, res, next) {
    const userId = 1; // Replace with actual user ID from session
    const courseId = req.body.courseId;

    db.query(`
        INSERT INTO enrollments (student_id, course_id, semester, year)
        VALUES ((SELECT id FROM students WHERE user_id = ?), ?, 'Fall', 2023)
    `, [userId, courseId], (err, result) => {
        if (err) {
            return res.status(500).send('Error enrolling in course');
        }
        res.redirect('/course_list');
    });
});

module.exports = router;