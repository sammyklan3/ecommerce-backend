require('dotenv').config();

const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10, // Adjust the number of connections based on your requirements
  queueLimit: 0
});

// Listen for the 'connection' event to log when the database is connected
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed: ', err.message);
  } else {
    console.log('Database connection successful!');
    connection.release(); // Release the connection when done
  }
});
module.exports = db.promise();
