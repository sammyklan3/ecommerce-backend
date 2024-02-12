const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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
app.use('/public/assets', express.static(path.join(__dirname, 'public', 'assets')));

const secret = process.env.JWT_SECRET || "2/19978d,8£!q5D`2$g#";

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const token= req.headers.authorization.split("")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Token not provided" });
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: "Token has expired" });
            } else {
                console.error("JWT verification error:", err);
                return res.status(403).json({ success: false, message: "Invalid token" });
            }
        }

        // If token is valid, add the decoded user information to the request object
        req.user = decoded;

        // Proceed to the next middleware or route handler
        next();
    });
}



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
        cb(null, path.join(__dirname, '/public/assets/'));
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
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
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

app.get("/", async(req, res) => {
    console.log(`Server is running at ${req.protocol}://${req.get("host")}:${port}`);
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

        // Generate JWT
        const token = jwt.sign({ username: username, }, secret, { expiresIn: '1h' });

        res.status(200).json({ success: true, message: "Successfully logged in", token });
    } catch (error) {
        console.error("Database error: " + error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Route handler for /currentUser endpoint
app.get("/currentUser", verifyToken, async (req, res) => {
    try {

    } catch (error) {
        console.error("Error fetching user role:", error);
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
                const productId = newId;

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

// Update the "/product/:ProductID" endpoint to fetch product images
app.get("/product/:ProductID", function (req, res) {
    const productID = req.params.ProductID;

    if (!productID) {
        console.log("Product ID not provided");
        return res.status(400).json({ success: false, error: "Product ID not provided" });
    }

    const getProductQuery = "SELECT * FROM products WHERE ProductID = ?";
    const getProductImagesQuery = "SELECT URL FROM product_images WHERE ProductID = ?";
    const getReviews = "SELECT reviews.*, users.username, users.profile_image FROM reviews INNER JOIN users ON reviews.UserID = users.UserID WHERE reviews.ProductID = ?";

    db.query(getProductQuery, [productID], (err, productResult) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }

        if (productResult.length < 1) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const product = productResult[0];

        db.query(getProductImagesQuery, [productID], (err, imagesResult) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, error: "Internal Server Error" });
            }

            const host = req.get('host');
            const protocol = req.protocol;

            // Construct full image URLs
            const images = imagesResult.map(image => `${protocol}://${host}/public/assets/${image.URL}`);


            db.query(getReviews, [productID], (err, results) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ success: false, error: "Internal Server Error" });
                } else {
                    const review = results.map((review) => {return review})

                    results.forEach(reviewItem => {
                        reviewItem.profile_image = `${protocol}://${host}/public/assets/${reviewItem.profile_image}`;
                    });

                    // Combine product details with image URLs
                    const productWithImages = { ...product, Images: images, Reviews: review };

                    res.status(200).json(productWithImages);
                }
            });



        });
    });
});


// Get Products with One Image URL
app.get("/products", function (req, res) {
    const sql = `
        SELECT p.*, pi.URL AS ImageURL
        FROM products p
        INNER JOIN (
            SELECT ProductID, URL
            FROM product_images
            GROUP BY ProductID
        ) pi ON p.ProductID = pi.ProductID
    `;

    db.query(sql, (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        }

        // Get the host address dynamically
        const host = req.get('host');
        const protocol = req.protocol;

        // Add the protocol and host to each image URL
        result.forEach(product => {
            product.ImageURL = `${protocol}://${host}/public/assets/${product.ImageURL}`;
        });

        res.status(200).json(result);
    });
});




// Delete products
app.delete("/products/:productId", (req, res) => {
    const productId = req.params.productId;

    // Query to fetch image URLs related to the product
    const getImageUrlsQuery = 'SELECT URL FROM product_images WHERE ProductID = ?';

    db.query(getImageUrlsQuery, [productId], (err, imageResults) => {
        if (err) {
            console.error('Error fetching image URLs:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Extract image URLs from the query results
        const imageUrls = imageResults.map(image => image.URL);

        // Query to delete product record from the database
        const deleteProductQuery = 'DELETE FROM products WHERE ProductID = ?';

        db.query(deleteProductQuery, [productId], (err, productDeleteResult) => {
            if (err) {
                console.error('Error deleting product:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            // Delete image files from the /assets/products/ folder
            imageUrls.forEach(imageUrl => {
                const imagePath = path.join(__dirname, 'public', 'assets', imageUrl);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error('Error deleting image file:', err);
                    } else {
                        console.log('Image file deleted successfully:', imagePath);
                    }
                });
            });

            res.status(204).send(); // 204 No Content - successful deletion
        });
    });
});

app.get ("/orders", (req, res) => {
    const query = "SELECT * FROM orders";
    db.query(query, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        } else {
            res.status(200).json(result);
        }
    });
});


// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at port:${port}`);
});
