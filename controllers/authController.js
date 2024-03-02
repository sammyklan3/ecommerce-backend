const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../modules/db');
const { generateRandomAlphanumericId } = require("../modules/middleware");
require('dotenv').config();

const secret = process.env.JWT_SECRET;

const signup = async (req, res) => {
    // Signup logic
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Using 10 salt rounds

        const [existingUser] = await db.promise().query("SELECT * FROM users WHERE Username = ?", [username]);

        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, error: "This user already exists" });
        }

        const newId = generateRandomAlphanumericId(9); // Assuming you have a function to generate random IDs
        const sqlQuery = "INSERT INTO users (UserID, Username, Password, date_created) VALUES (?, ?, ?, NOW())";

        await db.promise().query(sqlQuery, [newId, username, hashedPassword]);

        res.status(200).json({ success: true, message: "Account successfully created" });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

const login = async (req, res) => {
    // Login logic
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    try {
        const [user] = await db.promise().query("SELECT * FROM users WHERE Username = ?", [username]);

        if (user.length === 0) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }

        const match = await bcrypt.compare(password, user[0].Password);

        if (!match) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }

        // Generate JWT
        const token = jwt.sign({ username: username }, secret, { expiresIn: '1h' });

        res.status(200).json({ success: true, message: "Successfully logged in", token });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

module.exports = { signup, login };
