const express = require('express');
const router = express.Router();
const upload = require("../modules/upload");
const { verifyToken } = require("../modules/middleware");

const { signup, login} = require("../controllers/authController");
const home = require("../controllers/homeController");
const { getOrders } = require("../controllers/ordersController");
const { createProduct, getProduct, getProducts, deleteProduct } = require("../controllers/productController");

// Home route
router.get("/", home);

// Auth routes
router.post("/signup", signup);
router.post("/login", login);

// Orders route
router.get("/orders", getOrders);

// Products routes
router.post("/createProducts", upload.array("images", 5), verifyToken, createProduct);
router.get("/product/:ProductID", getProduct);
router.get("/products", getProducts);
router.delete("/products/:productId", deleteProduct);

module.exports = router;