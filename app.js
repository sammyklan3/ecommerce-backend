// Load environment variables from .env file during development
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
// Import other route modules as needed

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const { verifyToken } = require('./modules/middleware');

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Use middleware functions
app.use(verifyToken);

// Use route modules
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
// Use other route modules as needed
// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at port:${port}`);
});
