const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const multer = require("multer");
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

// Middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

// Serve static files from the assets directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Session middleware setup
app.use(session({
    secret: process.env.SESSION_SECRET || "2/19978d,8£!q5D`2$g#",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}));

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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'assets/products'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage, // Specify the storage configuration
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    }
});


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

        await db.promise().query(sql, [newId, username, hashedPassword, UserType]);

        res.status(200).json({ success: true, message: "Account successfully created" });
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

        const match = await bcrypt.compare(password, user[0].Password);

        if (!match) {
            return res.status(400).json({ success: false, error: "Username or Password is incorrect" });
        }

        res.status(200).json({ success: true, message: "Successfully logged in" });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Route for creating new products
app.post("/createProducts", upload.array("images", 5), async (req, res) => {
    const newId = generateRandomAlphanumericId(9);

    try {
        // Parse incoming request body for product data
        const { name, description, price, category, stockquantity, model, manufacturer } = req.body;

        // Check if the product already exists in the database
        const productExistsQuery = `SELECT COUNT(*) AS count FROM products WHERE Name = ?`;
        db.query(productExistsQuery, [name], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, error: "Internal Server Error" });
            }

            const productCount = result[0].count;
            if (productCount > 0) {
                // Product already exists, return error response
                return res.status(400).json({ success: false, error: "Product already exists" });
            }

            // Get current date and time
            const currentDate = new Date();
            // Format date and time as per your database requirements
            const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

            // Insert product data into products table
            const productInsertQuery = `
                INSERT INTO products (ProductID, Name, Description, Price, Category, StockQuantity, Model, Manufacturer, date_uploaded)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Inserting product details in the database
            db.query(productInsertQuery, [newId, name, description, price, category, stockquantity, model, manufacturer, formattedDate], (err, productResult) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ success: false, error: "Internal Server Error" });
                }

                // Retrieve auto generated id
                const productId = productResult.insertId;

                const imageNames = req.files.map(file => file.filename);

                // Insert image names into the database
                const imageInsertQuery = `INSERT INTO product_images (ProductID, URL) VALUES (?, ?)`;

                // Use a loop or Promise.all to ensure all image insertions are completed before sending response
                const insertPromises = imageNames.map(imageName => {
                    return new Promise((resolve, reject) => {
                        db.query(imageInsertQuery, [productId, imageName], (err, imageResult) => {
                            if (err) {
                                console.error("Database error:", err);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                });

                Promise.all(insertPromises)
                    .then(() => {
                        console.log('Product and images uploaded successfully.');
                        res.status(200).send('Product and images uploaded successfully.');
                    })
                    .catch(error => {
                        console.error("Error inserting image data:", error);
                        res.status(500).json({ success: false, error: "Internal Server Error" });
                    });
            });
        });
    } catch (error) {
        // Handle errors
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Add an endpoint to retrieve all images for a product
app.get("/productImages/:productId", (req, res) => {
    const productId = req.params.productId;

    const sql = "SELECT * FROM product_images WHERE ProductID = ?";

    db.query(sql, [productId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        } else if (result.length === 0) {
            res.status(400).json({ success: false, error: "The Images for this product are not available" });
        } else {
            res.status(200).json({ success: true, images: result });
        }
    });
});

// Update the "/product/:ProductID" endpoint to fetch product images
app.get("/product/:ProductID", function (req, res) {
    const productID = req.params.ProductID;

    if (!productID) {
        console.log("Product ID not provided");
        return res.status(400).json({ success: false, error: "Product ID not provided" });
    }

    const getProductQuery = "SELECT * FROM products WHERE ProductID = ?";
    const getProductImagesQuery = "SELECT URL FROM product_images WHERE ProductID = ?";

    db.query(getProductQuery, [productID], (err, productResult) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }

        if (productResult.length < 1) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const product = productResult[0];
        const getProductImages = () => {
            return new Promise((resolve, reject) => {
                db.query(getProductImagesQuery, [productID], (err, imagesResult) => {
                    if (err) {
                        console.error("Database error:", err);
                        reject(err);
                    }
                    resolve(imagesResult.map(image => image.URL));
                });
            });
        };

        getProductImages()
            .then(images => {
                const host = req.get('host');
                const fullImages = images.map(image => `http://${host}${image}`);
                res.status(200).json({ ...product, Images: fullImages });
            })
            .catch(error => {
                console.error("Error fetching product images:", error);
                res.status(500).json({ success: false, error: "Internal Server Error" });
            });
    });
});

// Get Products with One Image URL
app.get("/products", function (req, res) {
    const sql = "SELECT * FROM products JOIN product_images WHERE ProductID = product_images.ProductID";



    db.query(sql, (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        }

        // Get the host address dynamically
        const host = req.get('host');

        const protocal = req.protocol;

        // Map products to include only one image URL
        const productsWithOneImage = result.reduce((acc, product) => {
            if (!acc[product.ProductID]) {
                acc[product.ProductID] = { ...product, Images: `${protocal}://${host}${product.URL}` };
            }
            return acc;
        }, {});

        // Convert object to array
        const productsArray = Object.values(productsWithOneImage);

        res.status(200).json(productsArray);
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

// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
