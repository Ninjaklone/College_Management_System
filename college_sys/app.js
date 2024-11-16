// app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 5000;


var indexRouter = require('./routes/index');


// Middleware
app.use((req, res, next) => {
    res.locals.profilePic = '/Images/profile_pic.png'; // Set the route for the profile picture
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use('/', indexRouter)
// Routes
app.get('/', (req, res) => {
    res.render('login');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

app.get('/course_list', (req, res) => {
    db.query('SELECT * FROM courses', (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching courses');
        }
        res.render('course_list', { courses: results });
    });
});

app.get('/profile', (req, res) => {
    // Fetch user profile data from the database
    res .render('profile');
});

module.exports = app;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});