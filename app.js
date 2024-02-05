const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
require('dotenv').config(); // For handling environment variables

const port = 3000;

const app = express();

const saltRounds = 10;

app.use(cors());
// Use bodyParser middleware to parse incoming JSON data
app.use(bodyParser.json());

// Use express-fileupload middleware
app.use(fileUpload());

// Middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

// Serve static files from the public directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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
        return res.status(403).json({ error: 'Token not provided' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            // Handle specific error cases if needed
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(401).json({ error: 'Invalid token' });
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

app.post("/createProducts", function (req, res) {
    let products = req.body;
    const images = req.files && req.files.image;

    // Convert to array if it's a single product
    if (!Array.isArray(products)) {
        products = [products];
    }

    // Check if the array is empty
    if (!products.length) {
        res.status(301).json({ success: false, error: "No products provided" });
        return;
    }

    // Check if images are provided
    if (!images || (Array.isArray(images) && images.length === 0)) {
        res.status(301).json({ success: false, error: "No images provided" });
        return;
    }

    // Function to validate image files
    const isValidImage = (file) => {
        const allowedExtensions = ["jpg", "jpeg", "png", "gif"];
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

        const fileExtension = file.name.split(".").pop();
        return allowedExtensions.includes(fileExtension) && file.size <= maxSizeInBytes;
    };



    // Ensure images is always an array
    const imageArray = Array.isArray(images) ? images : [images];

    // Check if the uploaded files are images and of appropriate size
    if (!imageArray.every(isValidImage)) {
        res.status(301).json({ success: false, error: "Invalid or oversized images provided" });
        return;
    }

    // Array of product values
    const values = products.map((product, index) => {
        const { name, description, price, stockquantity, model, category } = product;
        const newId = generateRandomAlphanumericId(9);
        const currentDate = new Date().toISOString();
        const image = imageArray[index];

        // Move the image to the /assets/products folder
        const imagePath = path.join(__dirname, "/assets/products", newId + "_" + image.name);
        image.mv(imagePath, (err) => {
            if (err) {
                console.log("Error moving image: " + err);
            }
        });

        // Store relative path in the database
        const relativeImagePath = `products/${newId}_${image.name}`;

        return [newId, name, description, price, stockquantity, category, model, currentDate, relativeImagePath];
    });


    const sql = "INSERT INTO products (ProductID, Name, Description, Price, StockQuantity, Category, Model, date_uploaded, Images) VALUES ?";

    db.query(sql, [values], (err, results) => {
        if (err) {
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        }

        res.status(200).json({ success: true, message: "Products successfully created" });
    });
});


// Search Products
app.get("/product/:ProductID", function (req, res) {
    const productID = req.params.ProductID; // Use consistent naming

    console.log("Requested Product ID:", productID);

    if (!productID) {
        console.log("Product ID not provided");
        res.status(400).json({ success: false, error: "Product ID not provided" });
        return;
    }

    const sql = "SELECT * FROM products WHERE ProductID = ?";

    db.query(sql, [productID], (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error:", err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        }

        if (result.length < 1) {
            res.status(404).json({ success: false, error: "Product not found" });
        } else {
            // Dynamically generate full image paths
            const productsWithFullImagePath = result.map((product) => {
                const { Images: relativeImagePath, ...otherProductDetails } = product;
                const fullImagePath = `http://localhost:3000/assets/${relativeImagePath}`;
                return { ...otherProductDetails, Images: fullImagePath };
            });

            res.status(200).json(productsWithFullImagePath);
        }
    });
});



// Get Products
app.get("/products", function (req, res) {
    const sql = "SELECT * FROM products ORDER BY date_uploaded";

    db.query(sql, (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        } else {
            // Dynamically generate full image paths
            const productsWithFullImagePath = result.map((product) => {
                const { Images: relativeImagePath, ...otherProductDetails } = product;
                const fullImagePath = `http://localhost:3000/assets/${relativeImagePath}`;
                return { ...otherProductDetails, Images: fullImagePath };
            });

            res.status(200).json(productsWithFullImagePath);
        }
    });
});

// Delete products
app.delete("/products/:id", (req, res) => {
    const productId = req.params.id;

    const query = 'DELETE FROM products WHERE id = ?';

    db.query(query, [productId], (err, results) => {
        if (err) {
            console.error('Error deleting product:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.status(204).send(); // 204 No Content - successful deletion
        }
    });
});

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