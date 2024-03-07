const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../modules/db");
const { generateRandomAlphanumericId } = require("../modules/middleware");
require("dotenv").config();

const secret = process.env.JWT_SECRET;

const signup = async (req, res) => {
    // Signup logic
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Using 10 salt rounds

        const existingUserQuery = "SELECT * FROM users WHERE Username = ?";

        db.query(existingUserQuery, [username], async (err, result) => {
            if (err) {
                console.error("Database error: " + err);
                return res.status(500).json({ success: false, error: "Internal Server Error" });
            } else if (result.length > 0) {
                return res.status(400).json({ success: false, error: "This user already exists" });
            }

            const newId = generateRandomAlphanumericId(9); // Assuming you have a function to generate random IDs

            const sqlQuery = "INSERT INTO users (UserID, Username, Password, date_created) VALUES (?, ?, ?, NOW())";

            db.query(sqlQuery, [newId, username, hashedPassword], async (err, result) => {
                if (err) {
                    console.error("Database error: " + err);
                    return res.status(500).json({ success: false, error: "Internal Server Error" });
                }

                // Generate JWT
                const token = jwt.sign({ username: username }, secret, { expiresIn: '1h' });

                res.status(200).json({ success: true, message: "Account successfully created", token });
            });
        });
    } catch (err) {
        console.error("An error occured: " + err);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}

// Login logic
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    try {
        const userQuery = "SELECT * FROM users WHERE Username = ?";

        db.query(userQuery, [username], async (err, result) => {
            if (err) {
                console.error("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
            } else if (result.length === 0) {
                return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
            }

            const match = await bcrypt.compare(password, result[0].Password);

            if (!match) {
                return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
            }

            // Generate JWT
            const token = jwt.sign({ username: username }, secret, { expiresIn: '1h' });

            res.status(200).json({ success: true, message: "Successfully logged in", token });
        });
    } catch (err) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}

module.exports = { signup, login };