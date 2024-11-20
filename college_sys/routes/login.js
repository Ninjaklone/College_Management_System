var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', function(req, res, next) {
    res.render('login', { 
        title: 'Login', 
        page: 'login',
        error: null 
    });
});

router.post('/', function(req, res, next) {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            return res.render('login', { 
                title: 'Login', 
                page: 'login',
                error: 'Database error' 
            });
        }

        if (results.length > 0) {
            // Successful login
            // In a real app, you'd set up proper session management
            res.redirect('/');
        } else {
            res.render('login', { 
                title: 'Login', 
                page: 'login',
                error: 'Invalid username or password' 
            });
        }
    });
});

module.exports = router;