// db.js
const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    max: 20, // Maximum number of clients in the pool 
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
});

// Now you can use the pool to execute queries 
db.query('SELECT * FROM users', (err, result) => {
    if (err) { console.error('Error executing query:', err); }
    else { console.log('Query result:', result.rows); }
});

module.exports = db;
