const express = require('express');
const router = express.Router();
const upload = require("../modules/upload");
const { verifyToken } = require("../modules/middleware");

const { signup, login} = require("../controllers/authController");
const { getUserDetails ,getUserProfile, updateUserProfile, deleteUserAccount } = require("../controllers/profileController");
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
router.post("/createProducts", verifyToken, upload.array("images", 5), createProduct);
router.get("/product/:ProductID", getProduct);
router.get("/products", getProducts);
router.delete("/product/:productId", verifyToken ,deleteProduct);

// Profile routes
router.get("/profile/:userId", verifyToken, getUserProfile);
router.patch("/profile/:userId", verifyToken, updateUserProfile);
router.delete("/profile/:userId", verifyToken, deleteUserAccount);

// Current user details
router.get("/currentUser", verifyToken, getUserDetails);

// Banners routes
router.get("/banners", getBanners);
router.post("/banners", verifyToken, upload.single("image"), insertBanner);
router.delete("/banners/:bannerId", verifyToken, deleteBanner);

module.exports = router;