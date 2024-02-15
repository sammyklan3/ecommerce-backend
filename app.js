// Load environment variables from .env file during development
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const homeRoutes = require("./routes/homeRoute");
// Import other route modules as needed

const cors = require("cors");
const bodyParser = require("body-parser");

const { app } = require('./modules/middleware');

const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

// Use middleware functions

// Use route modules
app.use("/login", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", ordersRoutes);
app.use("/", homeRoutes);
// Use other route modules as needed

// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
