const apiRoutes = require('./routes/APIRoutes');
// Import other route modules as needed

const { app } = require('./modules/middleware');

const port = process.env.PORT;

// Use route modules
app.use("/api", apiRoutes);
// Use other route modules as needed

// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});