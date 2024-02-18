const db = require("../modules/db");
const fs = require("fs");
const path = require("path");
const { generateRandomAlphanumericId } = require("../modules/middleware");

const getBanners = async (req, res) => {
    try {
        const banners = await db.query("SELECT * FROM banners");

        if (banners.length === 0) {
            return res.status(404).json({ success: false, error: "There are no banners" });
        }

        // Get the host address dynamically
        const host = req.get('host');
        const protocol = req.protocol;

        const formattedBanners = banners.map(bannerItem => ({
            ...bannerItem,
            ImageName: `${protocol}://${host}/public/assets/${bannerItem.ImageName}`
        }));

        res.status(200).json({ success: true, banners: formattedBanners });
    } catch (err) {
        console.error("Error getting the banners", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

const insertBanner = async (req, res) => {
    try {
        if (!req.file || !req.body.link || !req.body.endDate || !req.body.productId) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const { link, endDate, priority, productId } = req.body;

        const bannerExists = await db.query("SELECT * FROM banners WHERE ProductID = @productId", { productId });

        if (bannerExists.length > 0) {
            return res.status(400).json({ success: false, error: "A banner already exists for this product" });
        }

        const formattedEndDate = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

        const newId = generateRandomAlphanumericId(9);

        const insertBannerQuery = `
            INSERT INTO banners (BannerID, ImageName, Link, StartDate, EndDate, Priority, ProductID) 
            VALUES (@newId, @imageName, @link, GETDATE(), @formattedEndDate, @priority, @productId)
        `;

        await db.query(insertBannerQuery, {
            newId,
            imageName: req.file.filename,
            link,
            formattedEndDate,
            priority,
            productId
        });

        res.status(201).json({ success: true, message: "Banner inserted successfully" });
    } catch (err) {
        console.error("Error inserting banner", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

const deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.bannerId;

        const imageNameResult = await db.query("SELECT ImageName FROM banners WHERE BannerID = @bannerId", { bannerId });

        if (imageNameResult.length === 0) {
            return res.status(404).json({ success: false, error: "Banner not found" });
        }

        const imageName = imageNameResult[0].ImageName;

        await db.query("DELETE FROM banners WHERE BannerID = @bannerId", { bannerId });

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
