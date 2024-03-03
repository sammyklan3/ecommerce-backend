const express = require('express');
const router = express.Router();
const upload = require("../modules/upload");
const { verifyToken } = require("../modules/middleware");

const { signup, login} = require("../controllers/authController");
const { getUserProfile, updateUserProfile, deleteUserAccount } = require("../controllers/profileController");
const home = require("../controllers/homeController");
const { getOrders } = require("../controllers/ordersController");
const { insertBanner, getBanners, deleteBanner } = require("../controllers/bannerController");
const { createProduct, getProduct, getProducts, deleteProduct } = require("../controllers/productController");

// Home route
router.get("/", home);

// Auth routes
router.post("/signup", signup);
router.post("/login", login);

// Orders route
router.get("/orders", getOrders);

// Products routes
router.post("/createProducts", upload.array("images", 5), createProduct);
router.get("/product/:ProductID", getProduct);
router.get("/products", getProducts);
router.delete("/product/:productId", deleteProduct);

// Profile routes
router.get("/profile/:userId", verifyToken, getUserProfile);
router.put("/profile/:userId", verifyToken, updateUserProfile);
router.delete("/profile/:userId", verifyToken, deleteUserAccount);

// Banners routes
router.get("/banners", getBanners);
router.post("/banners", upload.single("image"), insertBanner);
router.delete("/banners/:bannerId", deleteBanner);

module.exports = router;