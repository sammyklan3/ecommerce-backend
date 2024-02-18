const db = require('../modules/db');

// Get all users controller
const getUsers = async (req, res) => {
    try {
        const getUserQuery = "SELECT UserID, Username, Email, profile_image, date_created FROM users";
        const result = await db.query(getUserQuery);

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: "There are no registered users" });
        }

        // Get the host address dynamically
        const host = req.get('host');
        const protocol = req.protocol;

        const users = result.map(user => ({
            ...user,
            profile_image: `${protocol}://${host}/public/assets/${user.profile_image}`
        }));

        res.status(200).json({ success: true, users });
    } catch (err) {
        console.error("Error getting the user details", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get specific user using specified username controller
const getUser = async (req, res) => {
    try {
        if (!req.params.username) {
            return res.status(404).json({ success: false, message: "Please enter a username" });
        }

        const username = req.params.username;
        const getUserQuery = "SELECT UserID, Username, Email, profile_image, date_created FROM users WHERE username = @username";

        const result = await db.query(getUserQuery, { username });

        if (result.length === 0) {
            return res.status(400).json({ success: false, error: "The user does not exist" });
        }

        // Get the host address dynamically
        const host = req.get('host');
        const protocol = req.protocol;

        const profile_image = `${protocol}://${host}/public/assets/${result[0].profile_image}`;
        const userWithProfileImage = { ...result[0], profile_image };

        res.status(200).json({ success: true, user: userWithProfileImage });
    } catch (err) {
        console.error("Error getting the user details", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

module.exports = { getUser, getUsers };
