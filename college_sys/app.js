// app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 5000;

// Import route files
var loginRouter = require('./routes/login');
var indexRouter = require('./routes/index');
var courseListRouter = require('./routes/course_list');
var profileRouter = require('./routes/profile');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/login', loginRouter);
app.use('/', indexRouter);
app.use('/course_list', courseListRouter);
app.use('/profile', profileRouter);


module.exports = app;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});