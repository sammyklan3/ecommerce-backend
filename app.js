const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
require('dotenv').config(); // For handling environment variables

const port = 3000;

const app = express();

const saltRounds = 10;

app.use(cors());
// Use bodyParser middleware to parse incoming JSON data
app.use(bodyParser.json());

// Middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

// Setting a secure secret key
const secretKey = "2/19978d,8£!q5D`2$g#";

// Function to generate a unique ID
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



const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "phonepartsstore",
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
});

// Test the database connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ', err.message);
    } else {
        console.log('Database connection successful!');
        connection.release(); // Release the connection when done
    }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
        return res.status(403).json({ message: 'Token not provided' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            // Handle specific error cases if needed
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            return res.status(401).json({ message: 'Invalid token' });
        }

        console.log('Decoded token:', decoded);
        req.user = decoded;
        next();
    });


}

// Function for getting current user
app.get("/currentUser", verifyToken, (req, res) => {
    const { username, role } = req.user;
    res.json({ user: username, role });
});


// Signup route with password hashing
app.post("/signup", async (req, res) => {
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

        await db.promise().execute(sql, [newId, username, hashedPassword, UserType]);

        const token = jwt.sign({ username }, secretKey, { expiresIn: "1h" });

        res.status(200).json({ success: true, message: "Account successfully created", token });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Login route with password hashing
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    try {
        const [user] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);

        if (user.length === 0) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }
        const role = user[0].UserType;

        const match = await bcrypt.compare(password, user[0].Password);

        if (!match) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }

        const token = jwt.sign({ username, role }, secretKey, { expiresIn: "1h" });

        res.status(200).json({ success: true, message: "Successfully logged in", token });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Product Creation route
app.post("/createProducts", function (req, res) {
    const products = req.body;

    // Check if the array is empty
    if (!products) {
        res.status(301).json({ success: false, error: "No products provided" });
        return;
    }

    if (Array.isArray(products)) {
        // Array of products
        const values = products.map(product => {
            const { name, description, price, stockquantity, model, category } = product;
            const newId = generateRandomAlphanumericId(9);
            const currentDate = new Date().toISOString();

            return [newId, name, description, price, stockquantity, category, model, currentDate];
        });

        const sql = "INSERT INTO products (ProductID, Name, Description, Price, StockQuantity, Category, Model, date_uploaded) VALUES ?";

        db.query(sql, [values], (err, results) => {
            if (err) {
                console.log("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            }

            res.status(200).json({ success: true, message: "Products successfully created" });
        });
    } else {
        // Single product
        const { name, description, price, stockquantity, model, category } = products;
        const newId = generateRandomAlphanumericId(9);
        const currentDate = new Date().toISOString();

        const sql = "INSERT INTO products (ProductID, Name, Description, Price, StockQuantity, Category, Model, date_uploaded) VALUES (?,?,?,?,?,?,?,?)";

        db.query(sql, [newId, name, description, price, stockquantity, category, model, currentDate], (err, results) => {
            if (err) {
                console.log("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            }

            res.status(200).json({ success: true, message: "Product successfully created" });
        });
    }
});



// Search Users
app.get("/product/:id", function (req, res) {
    const productID = req.params.id;

    const sql = "SELECT * FROM products WHERE ProductID = ?";

    db.query(sql, [productID], (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        }

        if (result < 1) {
            res.status(404).json({ success: false, error: "This product is not available" });
        } else {
            res.status(200).json(result);
        }
    });
});

// Get Products
app.get("/products", function (req, res) {
    const sql = "SELECT * FROM products"

    db.query(sql, (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        } else {
            res.status(200).json(result);
        }
    })
})

// Manufacturer information addition route
app.post("/addManufacturer", function (req, res) {
    const { name, description } = req.body;

    if (!name, !description) {
        res.status(301).json({ success: false, error: "All fields are required" });
    } else {
        // Check if manufacturer already exists
        db.query("SELECT * FROM manufacturers WHERE Name = ?", [name], (err, result) => {
            if (err) {
                // Handle db error
                console.log("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            }

            // If Manufacturer is found
            if (result.length > 0) {
                res.status(301).json({ success: false, error: `The Manufacturer, ${name}, already exists` });
            } else {
                // Manufacturer is not found
                const sql = "INSERT INTO manufacturers (ManufacturerID, Name, Description) VALUES (?,?,?)";

                const newId = generateRandomAlphanumericId(9);

                // Logic execution
                db.query(sql, [newId, name, description], (err, result) => {
                    if (err) {
                        // Handle db error during insert
                        console.log("Database error: " + err);
                        res.status(500).json({ success: false, error: "Internal Server Error" });
                        return;
                    }
                    res.status(200).json({ success: true, message: "Manufacturer successfully added." });
                });

            }
        })
    }
});

// Get Orders 
app.get("/orders", verifyToken, (req, res) => {
    const { role } = req.user;
    
    if (role !== "admin") {
        res.status(400).json({ success: false, error: "You must be an admin" });
    } else {
        const sql = "SELECT * FROM orders";

        // Logic execution
        db.query(sql, (err, result) => {
            if (err) {
                // Handle db error during insert
                console.log("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            } else {
                res.status(200).json({ success: true, message: "Orders successfully queried.", result });
            }
        });
    }


})


// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});