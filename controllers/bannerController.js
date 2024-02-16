const fs = require("fs");
const path = require("path");
const db = require("../modules/db");

const { generateRandomAlphanumericId } = require("../modules/middleware");

const getBanners = async (req, res) => {
    try {
        const getBannersQuery = "SELECT * FROM banners"

        db.query(getBannersQuery, (err, result) => {
            if (err) {
                console.error("Error getting the user details", err);
                res.status(500).json({ success: false, error: "Internal server error" });
            } else if (result.length === 0) {
                res.status(400).json({ success: false, error: "There are no banners" });

            }
            // Get the host address dynamically
            const host = req.get('host');
            const protocol = req.protocol;

            result.forEach(bannerItem => {
                bannerItem.ImageName = `${protocol}://${host}/public/assets/${bannerItem.ImageName}`;
            });

            res.status(200).json({ success: true, result });

        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, error: "An error occurred" });
    }

}

const insertBanner = async (req, res) => {
    try {
        // Check if request contains file
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No image uploaded" });
        } else if (!req.body.link) {
            return res.status(400).json({ success: false, error: "Link cannot be empty" });
        } else if (!req.body.endDate) {
            return res.status(400).json({ success: false, error: "End date cannot be empty" });
        } else if (!req.body.productId) {
            return res.status(400).json({ success: false, error: "Product Id cannot be empty" });
        }

        const { link, endDate, priority, productId } = req.body;

        // Banner ID generation creation logic
        const newId = generateRandomAlphanumericId(9);

        // Check if a banner already exists for the given product ID
        const bannerExistsQuery = "SELECT * FROM banners WHERE ProductID = ?";
        db.query(bannerExistsQuery, [productId], (err, result) => {
            if (err) {
                console.error("Error checking if banner exists", err);
                return res.status(500).json({ success: false, error: "Internal server error" });
            }

            if (result.length > 0) {
                return res.status(400).json({ success: false, error: "A banner already exists for this product" });
            }

            // Format end date as a MySQL date string (YYYY-MM-DD HH:MM:SS)
            const formattedEndDate = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

            const insertBannerQuery = `
                INSERT INTO banners (BannerID, ImageName, Link, StartDate, EndDate, Priority, ProductID) 
                VALUES (?, ?, ?, NOW(), ?, ?, ?)
            `;

            db.query(insertBannerQuery, [newId, req.file.filename, link, formattedEndDate, priority, productId], (err, result) => {
                if (err) {
                    console.error("Error inserting banner", err);
                    res.status(500).json({ success: false, error: "Internal server error" });
                } else {
                    res.status(201).json({ success: true, message: "Banner inserted successfully" });
                }
            });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, error: "An error occurred" });
    }
}

const deleteBanner = async (req, res) => {
    try {
        if(!req.params.bannerId){
            res.status(404).json({ success: false, error: "Please provide the bannerId" });
        }

        const bannerId = req.params.bannerId;

        // Get the image name associated with the banner from the database
        const getImageNameQuery = "SELECT ImageName FROM banners WHERE BannerID = ?";
        db.query(getImageNameQuery, [bannerId], (err, result) => {
            if (err) {
                console.error("Error getting image name for deletion", err);
                return res.status(500).json({ success: false, error: "Internal server error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ success: false, error: "Banner not found" });
            }

            const imageName = result[0].ImageName;

            // Delete the banner record from the database
            const deleteBannerQuery = "DELETE FROM banners WHERE BannerID = ?";
            db.query(deleteBannerQuery, [bannerId], (err, result) => {
                if (err) {
                    console.error("Error deleting banner", err);
                    return res.status(500).json({ success: false, error: "Internal server error" });
                }

                // Delete the associated image file from the server
                const imagePath = path.join(__dirname, "../public/assets/", imageName);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error("Error deleting image file", err);
                        return res.status(500).json({ success: false, error: "Internal server error" });
                    }

                    res.status(200).json({ success: true, message: "Banner deleted successfully" });
                });
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "An error occurred" });
    }
}

module.exports = { insertBanner, getBanners, deleteBanner }