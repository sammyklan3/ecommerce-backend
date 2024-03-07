const db = require('../modules/db');

const getOrders = async (req, res) => {
    try {
        const query = "SELECT * FROM orders";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, error: "Internal Server Error" });
            } else {
                if (result.length > 0) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({ success: false, error: "No orders found" });
                }
            }
        })
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}

module.exports = { getOrders }