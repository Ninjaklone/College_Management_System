var express = require('express');
var router = express.Router();
const db = require('../db');
const path = require('path');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/profile-pics/');
    },
    filename: function(req, file, cb) {
        cb(null, `profile-${req.session.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes));
    }
});

// Get profile
router.get('/', function(req, res, next) {
    const userId = req.session.userId;

    db.query(`
        SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.role,
            u.profile_pic,
            COALESCE(s.first_name, f.first_name) AS first_name, 
            COALESCE(s.last_name, f.last_name) AS last_name,
            COALESCE(f.department, '') AS department
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE u.id = ?
    `, [userId], (err, userResults) => {
        if (err) {
            console.error('Profile fetch error:', err);
            return res.status(500).render('error', { 
                message: 'Error fetching profile information',
                error: { status: 500, stack: err.stack }
            });
        }

        if (userResults.length === 0) {
            return res.status(404).render('error', { 
                message: 'User not found',
                error: { status: 404 }
            });
        }

        const user = userResults[0];
        
        // Fetch additional information based on role
        if (user.role === 'student') {
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
                ORDER BY e.year DESC, e.semester DESC
            `, [userId], (err, coursesResults) => {
                if (err) {
                    console.error('Courses fetch error:', err);
                    coursesResults = [];
                }

                res.render('profile', {
                    title: 'Profile',
                    page: 'profile',
                    user: user,
                    courses: coursesResults,
                    profilePic: user.profile_pic || '/images/default-profile.png',
                    messages: req.flash()
                });
            });
        } else if (user.role === 'faculty') {
            db.query(`
                SELECT 
                    c.code, 
                    c.name, 
                    ca.semester, 
                    ca.year
                FROM course_assignments ca
                JOIN courses c ON ca.course_id = c.id
                WHERE ca.faculty_id = (SELECT id FROM faculty WHERE user_id = ?)
                ORDER BY ca.year DESC, ca.semester DESC
            `, [userId], (err, coursesResults) => {
                if (err) {
                    console.error('Courses fetch error:', err);
                    coursesResults = [];
                }

                res.render('profile', {
                    title: 'Profile',
                    page: 'profile',
                    user: user,
                    courses: coursesResults,
                    profilePic: user.profile_pic || '/images/default-profile.png',
                    messages: req.flash()
                });
            });
        } else {
            res.render('profile', {
                title: 'Profile',
                page: 'profile',
                user: user,
                courses: [],
                profilePic: user.profile_pic || '/images/default-profile.png',
                messages: req.flash()
            });
        }
    });
});

// Update profile
router.post('/', upload.single('profile_pic'), async function(req, res, next) {
    const userId = req.session.userId;

    try {
        // Start transaction
        await db.promise().beginTransaction();

        // Destructure form data
        const { 
            email,
            first_name, 
            last_name,
            department 
        } = req.body;

        // Update profile picture if uploaded
        const profilePicPath = req.file 
            ? `/uploads/profile-pics/${req.file.filename}` 
            : null;

        // Update user table
        const userUpdateQuery = profilePicPath 
            ? 'UPDATE users SET email = ?, profile_pic = ? WHERE id = ?' 
            : 'UPDATE users SET email = ? WHERE id = ?';
        
        const userUpdateParams = profilePicPath 
            ? [email, profilePicPath, userId] 
            : [email, userId];

        await db.promise().query(userUpdateQuery, userUpdateParams);

        // Get user role
        const [userRows] = await db.promise().query(
            'SELECT role FROM users WHERE id = ?', 
            [userId]
        );
        const userRole = userRows[0].role;

        // Update role-specific information
        if (userRole === 'student') {
            await db.promise().query(`
                UPDATE students 
                SET 
                    first_name = ?, 
                    last_name = ?
                WHERE user_id = ?
            `, [first_name, last_name, userId]);
        } else if (userRole === 'faculty') {
            await db.promise().query(`
                UPDATE faculty 
                SET 
                    first_name = ?, 
                    last_name = ?,
                    department = ?
                WHERE user_id = ?
            `, [first_name, last_name, department, userId]);
        }

        // Commit transaction
        await db.promise().commit();
        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');

    } catch (err) {
        // Rollback on error
        await db.promise().rollback();
        console.error('Profile update error:', err);
        req.flash('error', 'Error updating profile');
        res.redirect('/profile');
    }
});

module.exports = router;