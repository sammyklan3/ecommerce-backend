const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../modules/db');
require('dotenv').config();

const secret = process.env.JWT_SECRET;

const signup = async(req, res) => {
    // Signup logic
    const { username, password } = req.body;

    const UserType = "user";

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [existingUser] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);

        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, error: "This user already exists" });
        }

        const newId = generateRandomAlphanumericId(9);
        const sql = "INSERT INTO users (UserID, username, password, UserType) VALUES (?, ?, ?, ?)";

        await db.promise().query(sql, [newId, username, hashedPassword, UserType]);

        res.status(200).json({ success: true, message: "Account successfully created" });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

const login = async(req, res) => {
    // Login logic
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    try {
        const [user] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);

        if (user.length === 0) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }

        const match = await bcrypt.compare(password, user[0].Password);

        if (!match) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }

        // Generate JWT
        const token = jwt.sign({ username: username, }, secret, { expiresIn: '1h' });

        res.status(200).json({ success: true, message: "Successfully logged in", token });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

module.exports =  { signup, login};
