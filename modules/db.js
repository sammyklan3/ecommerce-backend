// db.js
require('dotenv').config();

const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
});

// Test the database connection
db.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection failed: ', err.message);
    } else {
      console.log('Database connection successful!');
      connection.release(); // Release the connection when done
    }
  });

module.exports = db;
