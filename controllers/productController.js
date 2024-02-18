const sql = require('mssql');
const path = require('path');
const fs = require("fs");

const { generateRandomAlphanumericId } = require("../modules/middleware");
const { poolPromise } = require('../modules/db');

const createProduct = async (req, res) => {

    // Product creation logic
    const newId = generateRandomAlphanumericId(9);

    try {
        const pool = await poolPromise;
        
        // Parse incoming request body for product data
        const { name, description, price, category, stockquantity, model, manufacturer } = req.body;

        if (!name || !description || !price || !category || !stockquantity || !model || !manufacturer) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        // Check if the product already exists in the database
        const productExistsQuery = `SELECT COUNT(*) AS count FROM products WHERE Name = @name`;
        const productExistsResult = await pool.request()
            .input('name', sql.NVarChar, name)
            .query(productExistsQuery);

        const productCount = productExistsResult.recordset[0].count;
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
            VALUES (@newId, @name, @description, @price, @category, @stockquantity, @model, @manufacturer, @formattedDate)
        `;

        await pool.request()
            .input('newId', sql.NVarChar, newId)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('price', sql.Decimal, price)
            .input('category', sql.NVarChar, category)
            .input('stockquantity', sql.Int, stockquantity)
            .input('model', sql.NVarChar, model)
            .input('manufacturer', sql.NVarChar, manufacturer)
            .input('formattedDate', sql.NVarChar, formattedDate)
            .query(productInsertQuery);

        // Retrieve auto-generated product ID
        const productId = newId;

        if (!req.files || req.files.length < 5) {
            return res.status(400).json({ success: false, error: "Minimum 5 images are required" });
        }

        // Insert image names into the database
        const imageInsertQuery = `INSERT INTO product_images (ProductID, URL) VALUES (@productId, @filename)`;

        // Use Promise.all to ensure all image insertions are completed before sending the response
        const insertPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                pool.request()
                    .input('productId', sql.NVarChar, productId)
                    .input('filename', sql.NVarChar, file.filename)
                    .query(imageInsertQuery, (err, result) => {
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
    } catch (error) {
        // Handle errors
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



const getProduct = async (req, res) => {
    // Get product logic
    const productID = req.params.ProductID;

    if (!productID) {
        console.log("Product ID not provided");
        return res.status(400).json({ success: false, error: "Product ID not provided" });
    }

    try {
        const pool = await poolPromise;

        const getProductQuery = "SELECT * FROM products WHERE ProductID = @productID";
        const getProductImagesQuery = "SELECT URL FROM product_images WHERE ProductID = @productID";
        const getReviews = "SELECT reviews.*, users.username, users.profile_image FROM reviews INNER JOIN users ON reviews.UserID = users.UserID WHERE reviews.ProductID = @productID";

        const productResult = await pool.request()
            .input('productID', sql.VarChar, productID)
            .query(getProductQuery);

        if (productResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const product = productResult.recordset[0];

        const imagesResult = await pool.request()
            .input('productID', sql.VarChar, productID)
            .query(getProductImagesQuery);

        const host = req.get('host');
        const protocol = req.protocol;

        // Construct full image URLs
        const images = imagesResult.recordset.map(image => `${protocol}://${host}/public/assets/${image.URL}`);

        const reviewsResult = await pool.request()
            .input('productID', sql.VarChar, productID)
            .query(getReviews);

        const reviews = reviewsResult.recordset.map(review => {
            review.profile_image = `${protocol}://${host}/public/assets/${review.profile_image}`;
            return review;
        });

        // Combine product details with image URLs
        const productWithImages = { ...product, Images: images, Reviews: reviews };

        res.status(200).json(productWithImages);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

const getProducts = async (req, res) => {
    try {
        const pool = await poolPromise;

        const sqlQuery = `
            SELECT p.*, 
                (SELECT TOP 1 pi.URL FROM product_images pi WHERE pi.ProductID = p.ProductID) AS ImageURL
            FROM products p
        `;

        const result = await pool.request().query(sqlQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "There are no products available" });
        }

        // Get the host address dynamically
        const host = req.get('host');
        const protocol = req.protocol;

        // Add the protocol and host to each image URL
        const products = result.recordset.map(product => ({
            ...product,
            ImageURL: `${protocol}://${host}/public/assets/${product.ImageURL}`
        }));

        res.status(200).json(products);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};


const deleteProduct = async (req, res) => {
    try {
        const pool = await poolPromise;

        if (!req.params.productId) {
            return res.status(404).json({ success: false, error: "No product Id has been provided" });
        }

        const productId = req.params.productId;

        // Query to check if the product exists
        const getProductQuery = 'SELECT * FROM products WHERE ProductID = @productId';

        const productResults = await pool.request()
            .input('productId', sql.VarChar, productId)
            .query(getProductQuery);

        if (productResults.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "The product is not available." });
        }

        // Query to fetch image URLs related to the product
        const getImageUrlsQuery = 'SELECT URL FROM product_images WHERE ProductID = @productId';

        const imageResults = await pool.request()
            .input('productId', sql.VarChar, productId)
            .query(getImageUrlsQuery);

        // Extract image URLs from the query results
        const imageUrls = imageResults.recordset.map(image => image.URL);

        // Query to delete product record from the database
        const deleteProductQuery = 'DELETE FROM products WHERE ProductID = @productId';

        await pool.request()
            .input('productId', sql.VarChar, productId)
            .query(deleteProductQuery);

        // Delete image files from the /assets/products/ folder
        imageUrls.forEach(imageUrl => {
            const imagePath = path.join(__dirname, "../public/assets/", imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error deleting image file:', err);
                } else {
                    console.log('Image file deleted successfully:', imagePath);
                }
            });
        });

        res.status(204).send(); // 204 No Content - successful deletion
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { createProduct, getProduct, getProducts, deleteProduct };
