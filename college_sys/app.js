require('dotenv').config();
// app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { authMiddleware } = require('./auth');
const flash = require('express-flash');

const app = express();
const PORT = process.env.PORT || 5000;


// Import route files
var loginRouter = require('./routes/login');
const dashboardRouter = require('./routes/index');
var courseListRouter = require('./routes/course_list');
var profileRouter = require('./routes/profile');
const registerRouter = require('./routes/register');
const adminRouter = require('./routes/admin');


// Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret_key', // Use a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to check authentication status
app.use((req, res, next) => {
    // Exclude login and register routes from authentication
    const publicRoutes = ['/login', '/register'];
    if (publicRoutes.includes(req.path)) {
        return next();
    }
    
    // Apply authentication middleware to all other routes
    authMiddleware(req, res, next);
});

// Routes
app.use('/', dashboardRouter);
app.use('/login', loginRouter);
app.use('/course_list', courseListRouter);
app.use('/profile', profileRouter);
app.use('/register', registerRouter);
app.use('/admin', adminRouter);


//Server (HTTP Server)
const server = http.createServer(app);
module.exports = {app, server};
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



