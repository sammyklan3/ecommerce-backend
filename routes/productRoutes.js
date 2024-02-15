// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { createProduct, getProduct, getProducts, deleteProduct } = require('../controllers/productController');

router.post('/createProducts', createProduct);
router.get('/products/:ProductID', getProduct);
router.get('/', getProducts);
router.delete('/products/:productId', deleteProduct);

module.exports = router;
