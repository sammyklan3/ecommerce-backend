const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const port = 3000;

const app = express();

app.use(cors());
// Use bodyParser middleware to parse incoming JSON data
app.use(bodyParser.json());

// Middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

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


// Signup route
app.post("/signup", (req, res) => {
    // Accessing the username
    const { username, password } = req.body;

    if (!username && !password) {
        res.status(400).json({ success: false, message: "Username and password are required" });
        return;
    } else {

        db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
            if (err) {
                // Handle db error
                console.log("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            }

            // If a user already exists
            if (results.length > 0) {
                res.status(400).json({ success: false, error: "This user already exists" });
            } else {
                // If no user is found
                const sql = "INSERT INTO users (UserID, username, password) VALUES (?, ?, ?)";

                const newId = generateRandomAlphanumericId(9);

                console.log(newId);

                db.query(sql, [newId, username, password], (err, results) => {
                    if (err) {
                        // Handle db error during insert
                        console.log("Database error: " + err);
                        res.status(500).json({ success: false, error: "Internal Server Error" });
                        return;
                    }

                    res.status(200).json({ success: true, message: "Account successfully created" });
                });
            }
        });
    };


});


// Login route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    console.log('Received data:', { username, password });

    // Check if username and password are empty
    if (!username && !password) {
        res.status(400).json({ success: false, error: "Username and password are required" });
        return;

    } else {
        // Execute logic
        const sql = "SELECT * FROM users WHERE Username = ? AND Password = ?";

        db.query(sql, [username, password], (error, results) => {
            if (error) {
                // Handle db error
                console.log("Database error: " + error);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            }
            // If a user already exists
            if (results.length > 0) {
                res.status(200).json({ success: true, message: "Successfully logged in" });
            } else {
                res.status(400).json({ success: false, error: "Username or Password is incorrect" });
            }
        });
    };

});

// Product Creation route
app.post("/createProduct", function (req, res) {
    const { name, description, price, stockquantity, model } = req.body;

    // Check if the body is empty
    if (!name && !description && !price && !stockquantity && !model) {
        res.status(301).json({ success: false, error: "All fields are required" });
    } else {
        db.query("SELECT Name FROM products WHERE Name = ?", [name], (err, result) => {
            if (err) {
                // Handle db error
                console.log("Database error: " + err);
                res.status(500).json({ success: false, error: "Internal Server Error" });
                return;
            }

            if (result.length > 0) {
                res.status(400).json({ success: false, error: "This product already exists" });
            } else {
                // Logic execution
                const sql = "INSERT INTO products (ProductID, Name, Description, Price, StockQuantity, Model, date_uploaded) VALUES (?,?,?,?,?,?,?)";

                // Create a new Date object
                var currentDate = new Date();

                // Get the current date and time
                var currentDateTime = currentDate.toISOString();

                const newId = generateRandomAlphanumericId(9);

                db.query(sql, [newId, name, description, price, stockquantity, model, currentDateTime], (err, results) => {
                    if (err) {
                        // Handle db error during insert
                        console.log("Database error: " + err);
                        res.status(500).json({ success: false, error: "Internal Server Error" });
                        return;
                    }
                    res.status(200).json({ success: true, message: "Product successfully created" });
                })
            }
        })

    }


});

// Search Users
app.get("/product/:id", function(req, res) {
    const productID = req.params.id;

    const sql = "SELECT * FROM products WHERE ProductID = ?";

    db.query(sql, [productID], (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        } 
        
        if(result < 1){
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


// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});