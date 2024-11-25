// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined');
    process.exit(1);
}

// function authenticateToken(req, res, next) {
//     const token = req.cookies.token;

//     if (!token) {
//         return res.redirect('/login');
//     }

//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.user = decoded;
//         next();
//     } catch (error) {
//         // Token is invalid
//         res.clearCookie('token');
//         return res.redirect('/login');
//     }
// }

// Role-based authorization
// function authorizeRole(roles) {
//     return (req, res, next) => {
//         if (!req.user || !roles.includes(req.user.role)) {
//             return res.status(403).render('error', { 
//                 message: 'Access Denied',
//                 error: { status: 403 }
//             });
//         }
//         next();
//     };
// }

function authMiddleware(req, res, next) {
    console.log('Session in auth middleware:', req.session)
    // Check if user is authenticated
    if (!req.session || !req.session.userId) {
        // If not authenticated, redirect to login page
        console.log('User not authenticated, redirecting to login page')
        return res.redirect('/login');
    }
    
    // If authenticated, attach user to request for further use
    req.user = {
        userId: req.session.userId,
        role: req.session.role
    };
    console.log('User authenticated, proceeding to next middleware')
    next();
}

const adminAuthMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    if (req.session.role !== 'admin') {
        req.flash('error', 'Unauthorized access');
        return res.redirect('/dashboard');
    }
    
    next();
};

module.exports = {
    authMiddleware,
    adminAuthMiddleware
};