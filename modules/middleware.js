// middleware.js
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

app.use('/public/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Middleware to verify JWT
function verifyToken(req, res, next) {
    if (req.headers.authorization) {
        try {
            const token = req.headers.authorization.split(" ")[1];

            const secret = process.env.JWT_SECRET;

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
        } catch (err) {
            console.log(e.message); //error message here
            res.status(401).json({ message: "Not authorized" });
        }
    } else (
        res.status(403).json({ success: false, message: "Token not provided" })
    )
}

// Function to generate a random alphanumeric ID with a specific length
function generateRandomAlphanumericId(length) {
    const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}

module.exports = { app, verifyToken, generateRandomAlphanumericId };
