const db = require('../modules/db');

const getOrders = async (req, res) => {
    const query = "SELECT * FROM orders";
    db.query(query, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        } else {
            res.status(200).json(result);
        }
    })
}

module.exports = { getOrders }