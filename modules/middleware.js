// middleware.js
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();

app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

app.use('/public/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Token not provided" });
    }

    const secret = process.env.JWT_SECRET || "2/19978d,8£!q5D`2$g#";

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: "Token has expired" });
            } else {
                console.error("JWT verification error:", err);
                return res.status(403).json({ success: false, message: "Invalid token" });
            }
        }

        req.user = decoded;
        next();
    });
}

module.exports = { verifyToken };
