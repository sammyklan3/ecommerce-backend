const db = require('../modules/db');
const path = require('path');
const fs = require("fs").promises;

const { generateRandomAlphanumericId } = require("../modules/middleware");

const createProduct = async (req, res) => {
    // Product creation logic
    const newId = generateRandomAlphanumericId(9);

    try {
        // Parse incoming request body for product data
        const { name, description, price, category, stockquantity, model, manufacturer } = req.body;

        if (!name || !description || !price || !category || !stockquantity || !model || !manufacturer) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        // Check if the product already exists in the database
        const productExistsQuery = `SELECT COUNT(*) AS count FROM products WHERE Name = ?`;
        const [productCountRow] = await db.promise().query(productExistsQuery, [name]);
        const productCount = productCountRow[0].count;

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
        await db.promise().query(productInsertQuery, [newId, name, description, price, category, stockquantity, model, manufacturer, formattedDate]);

    
        
        
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
        const getProductQuery = "SELECT * FROM products WHERE ProductID = ?";
        const [productResult] = await db.query(getProductQuery, [productID]);

        if (productResult.length < 1) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const product = productResult[0];

        const getProductImagesQuery = "SELECT URL FROM product_images WHERE ProductID = ?";
        const [imagesResult] = await db.query(getProductImagesQuery, [productID]);

        const host = req.get('host');
        const protocol = req.protocol;

        // Construct full image URLs
        const images = imagesResult.map(image => `${protocol}://${host}/public/assets/${image.URL}`);

        const getReviews = "SELECT reviews.*, users.username, users.profile_image FROM reviews INNER JOIN users ON reviews.UserID = users.UserID WHERE reviews.ProductID = ?";
        const [results] = await db.query(getReviews, [productID]);

        results.forEach(reviewItem => {
            reviewItem.profile_image = `${protocol}://${host}/public/assets/${reviewItem.profile_image}`;
        });

        // Combine product details with image URLs
        const productWithImages = { ...product, Images: images, Reviews: results };

        res.status(200).json(productWithImages);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProducts = async (req, res) => {
    // Get products logic
    const sql = `
        SELECT p.*, pi.URL AS ImageURL
        FROM products p
        INNER JOIN (
            SELECT ProductID, URL
            FROM product_images
            GROUP BY ProductID
        ) pi ON p.ProductID = pi.ProductID
    `;

    try {
        const [result] = await db.query(sql);

        if (result.length === 0) {
            res.status(404).json({ success: false, error: "There are no products available" });
        } else {
            const host = req.get("host");
            const protocol = req.protocol;

            // Add the protocol and host to each image URL
            result.forEach(product => {
                product.ImageURL = `${protocol}://${host}/public/assets/${product.ImageURL}`;
            });

            res.status(200).json(result);
        }
    } catch (error) {
        // Handle db error
        console.error("Database error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.productId;

        if (!productId) {
            res.status(404).json({ success: false, error: "No product Id has been provided" });
            return;
        }
        
        // Query to check if the product exists
        const getProductQuery = 'SELECT * FROM products WHERE ProductID = ?';
        const [productResults] = await db.execute(getProductQuery, [productId]);

        if (productResults.length === 0) {
            res.status(404).json({ success: false, error: "The product is not available." });
            return;
        }

        // Query to fetch image URLs related to the product
        const getImageUrlsQuery = 'SELECT URL FROM product_images WHERE ProductID = ?';
        const [imageResults] = await db.execute(getImageUrlsQuery, [productId]);

        // Extract image URLs from the query results
        const imageUrls = imageResults.map(image => image.URL);

        // Query to delete product record from the database
        const deleteProductQuery = 'DELETE FROM products WHERE ProductID = ?';
        await db.exe(deleteProductQuery, [productId]);

        // Delete image files from the /assets/products/ folder
        await Promise.all(imageUrls.map(async imageUrl => {
            const imagePath = path.join(__dirname, "../public/assets/", imageUrl);
            await fs.unlink(imagePath);
            console.log('Image file deleted successfully:', imagePath);
        }));

        res.status(204).send(); // 204 No Content - successful deletion
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { createProduct, getProduct, getProducts, deleteProduct };
