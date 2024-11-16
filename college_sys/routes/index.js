var express = require('express');
var router = express.Router();

/* GET dashboard page. */
router.get('/', function(req, res, next) {
    res.render('Dashboard', { title: 'Dashboard', page: 'dashboard' });
});

/* GET course list page. */
router.get('/course_list', function(req, res, next) {
    res.render('course_list', { title: 'Course List', page: 'course_list' });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
    res.render('login', { title: 'Login', page: 'login' });
});

/* GET profile page. */
router.get('/profile', function(req, res, next) {
    res.render('profile', { title: 'Profile', page: 'profile' });
});

module.exports = router;