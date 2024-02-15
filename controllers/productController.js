const db = require('../modules/db');

const createProduct = async (req, res) => {

    // Product creation logic
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
};

const getProduct = async (req, res) => {
    // Get product logic
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
                    const review = results.map((review) => { return review })

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

    db.query(sql, (err, result) => {
        if (err) {
            // Handle db error
            console.log("Database error: " + err);
            res.status(500).json({ success: false, error: "Internal Server Error" });
            return;
        } else if (result.length === 0) {
            res.status(404).json({ success: false, error: "There are no products available" });
        } else {
            // Get the host address dynamically
            const host = req.get('host');
            const protocol = req.protocol;

            // Add the protocol and host to each image URL
            result.forEach(product => {
                product.ImageURL = `${protocol}://${host}/public/assets/${product.ImageURL}`;
            });

            res.status(200).json(result);
        }

    });
};

const deleteProduct = async (req, res) => {
    // Delete product logic
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
            } else if (productDeleteResult.length === 0) {
                res.status(404).json({ success: flase, error: "The products is not available." });
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
};

module.exports = { createProduct, getProduct, getProducts, deleteProduct };
