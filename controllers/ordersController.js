const db = require('../modules/db');

const getOrders = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM orders");

        if (result.length > 0) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ success: false, error: "No orders found" });
        }
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

module.exports = { getOrders };
