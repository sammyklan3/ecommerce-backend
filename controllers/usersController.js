const db = require("../modules/db");

// Get all users controller
const getUsers = async (req, res) => {
    try {
        const getUserQuery = "SELECT UserID, Username, Email, profile_image, date_created FROM users";

        db.query(getUserQuery, (err, result) => {
            if (err) {
                console.error("Error getting the user details", err);
                res.status(500).json({ success: false, error: "Internal server error" });
            } else if (result.length === 0) {
                res.status(400).json({ success: false, error: "There are no registered users" });
            }

            // Get the host address dynamically
            const host = req.get('host');
            const protocol = req.protocol;

            result.forEach(user => {
                user.profile_image = `${protocol}://${host}/public/assets/${user.profile_image}`;
            });

            res.status(200).json({ success: true, result});
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "An error occurred" })
    }
}

// Get specific user using specified username controller
const getUser = async (req, res) => {
    try {
        if (!req.params.username) {
            res.status(404).json({ success: false, message: "Please enter a username" });
        } else {
            const username = req.params.username;
            const getUserQuery = "SELECT UserID, Username, Email, profile_image, date_created FROM users WHERE username = ?";

            db.query(getUserQuery, [username], (err, result) => {
                if (err) {
                    console.error("Error getting the user details", err);
                    res.status(500).json({ success: false, error: "Internal server error" });
                } else if (result.length === 0) {
                    res.status(400).json({ success: false, error: "The user does not exist" });
                }
                // Get the host address dynamically
                const host = req.get('host');
                const protocol = req.protocol;

                const profile_image = `${protocol}://${host}/public/assets/${result[0].profile_image}`;


                const resultWithProfileImage = { ...result, profile_image: profile_image }

                res.status(200).json({ success: true, resultWithProfileImage });
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, error: "An error occurred" });
    }
}

module.exports = { getUser, getUsers }