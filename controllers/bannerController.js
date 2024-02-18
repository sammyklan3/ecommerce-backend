const sql = require('mssql');
const fs = require("fs");
const path = require("path");
const { generateRandomAlphanumericId } = require("../modules/middleware");
const { poolPromise } = require("../modules/db");

const getBanners = async (req, res) => {
    try {
        const pool = await poolPromise;

        const getBannersQuery = "SELECT * FROM banners";

        const result = await pool.request().query(getBannersQuery);

        if (result.recordset.length === 0) {
            return res.status(400).json({ success: false, error: "There are no banners" });
        }

<<<<<<< HEAD
<<<<<<< HEAD
        // Get the host address dynamically
        const host = req.get('host');
        const protocol = req.protocol;
=======
            res.status(200).json({ success: true, result });
>>>>>>> 326bc6e (Reverting to mysql)
=======
            res.status(200).json({ success: true, result });
>>>>>>> 18e03513e32217fad5fcf8ee35ea24a475e16cf4

        const banners = result.recordset.map(bannerItem => ({
            ...bannerItem,
            ImageName: `${protocol}://${host}/public/assets/${bannerItem.ImageName}`
        }));

        res.status(200).json({ success: true, banners });
    } catch (err) {
        console.error("Error getting the banners", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

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

        const pool = await poolPromise;

        // Check if a banner already exists for the given product ID
        const bannerExistsQuery = "SELECT * FROM banners WHERE ProductID = @productId";
        const bannerExistsResult = await pool.request()
            .input('productId', sql.VarChar, productId)
            .query(bannerExistsQuery);

        if (bannerExistsResult.recordset.length > 0) {
            return res.status(400).json({ success: false, error: "A banner already exists for this product" });
        }

        // Format end date as a SQL Server date string (YYYY-MM-DD HH:MM:SS)
        const formattedEndDate = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

        const insertBannerQuery = `
            INSERT INTO banners (BannerID, ImageName, Link, StartDate, EndDate, Priority, ProductID) 
            VALUES (@newId, @imageName, @link, GETDATE(), @formattedEndDate, @priority, @productId)
        `;

        await pool.request()
            .input('newId', sql.VarChar, newId)
            .input('imageName', sql.VarChar, req.file.filename)
            .input('link', sql.VarChar, link)
            .input('formattedEndDate', sql.DateTime, formattedEndDate)
            .input('priority', sql.Int, priority)
            .input('productId', sql.VarChar, productId)
            .query(insertBannerQuery);

        res.status(201).json({ success: true, message: "Banner inserted successfully" });
    } catch (err) {
        console.error("Error inserting banner", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

const deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.bannerId;

        const pool = await poolPromise;

        // Get the image name associated with the banner from the database
        const getImageNameQuery = "SELECT ImageName FROM banners WHERE BannerID = @bannerId";
        const imageNameResult = await pool.request()
            .input('bannerId', sql.VarChar, bannerId)
            .query(getImageNameQuery);

        if (imageNameResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: "Banner not found" });
        }

        const imageName = imageNameResult.recordset[0].ImageName;

        // Delete the banner record from the database
        const deleteBannerQuery = "DELETE FROM banners WHERE BannerID = @bannerId";
        await pool.request()
            .input('bannerId', sql.VarChar, bannerId)
            .query(deleteBannerQuery);

        // Delete the associated image file from the server
        const imagePath = path.join(__dirname, "../public/assets/", imageName);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error("Error deleting image file", err);
                return res.status(500).json({ success: false, error: "Internal server error" });
            }

            res.status(200).json({ success: true, message: "Banner deleted successfully" });
        });
    } catch (err) {
        console.error("Error deleting banner", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

module.exports = { insertBanner, getBanners, deleteBanner };
