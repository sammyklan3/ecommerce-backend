const db = require("../modules/db");
const fs = require("fs");

// Route to get the UserId and username of the currently logged in user
const getUserDetails = async (req, res) => {

    try {
        const getUserDetailsquery = "SELECT UserID FROM users WHERE Username = ?";

        db.query(getUserDetailsquery, [req.user.username], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal server error" });
            } else {
                res.status(200).json({ username: req.user.username, userId: result[0].UserID });
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

const getUserProfile = async (req, res) => {

    if (!req.params.userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    try {
        // Assuming you have some way to get the user ID from the request
        const userId = req.params.userId; // Change this according to your actual request object
        // Fetch user profile data from the database

        const getUserProfiledb = "SELECT UserID, Username, Email, profile_image, Shipping_address, Order_history, date_created FROM users WHERE UserId = ?";

        db.query(getUserProfiledb, [userId], (err, result) => {
            if (err) {

                console.log(err);
                res.status(500).json({ error: "Internal server error" });

            } else if (!result || result.length === 0) {

                res.status(404).json({ error: "User not found" });

            } else {

                const host = req.get("host");
                const protocol = req.protocol;

                result.forEach(userProfile => {
                    userProfile.profile_image = `${protocol}://${host}/public/assets/${userProfile.profile_image}`;
                });

                res.status(200).json(result);
            }
        });
    } catch (error) {
        // Handle any errors that occur during the process
        console.error("Error getting user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Update user profile details
const updateUserProfile = async (req, res) => {
    if (!req.params.userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    } else if (!req.body.username || !req.body.email || !req.body.shippingAddress) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const userId = req.params.userId;

        // Check if the user exists
        const checkUserQuery = "SELECT * FROM users WHERE UserId = ?";

        db.query(checkUserQuery, [userId], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal server error" });
            } else {
                if (!result || result.length === 0) {
                    return res.status(404).json({ error: "User not found" });
                }

                const { username, email, shippingAddress } = req.body; // Assuming these are the fields that can be updated

                const updateUserProfileQuery = "UPDATE users SET Username = ?, Email = ?, Shipping_address = ? WHERE UserId = ?";

                db.query(updateUserProfileQuery, [username, email, shippingAddress, userId], (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(500).json({ error: "Internal server error" });
                    }

                    res.status(200).json({ success: true, message: "User profile updated successfully" });
                });
            }

        });


    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Delete user account
const deleteUserAccount = async (req, res) => {

    if (!req.params.userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    try {
        const userId = req.params.userId;

        // Check if the user exists
        const checkUserQuery = "SELECT * FROM users WHERE UserId = ?";

        db.query(checkUserQuery, [userId], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal server error" });
            } else {
                if (!result || result.length === 0) {
                    return res.status(404).json({ error: "User not found" });
                }

                // Fetch the profile image filename from the database
                const getProfileImageQuery = "SELECT profile_image FROM users WHERE UserId = ?";
                const profileImageRow = db.query(getProfileImageQuery, [userId]);

                // Check if a profile image filename is found
                if (profileImageRow && profileImageRow.profile_image) {
                    const profileImagePath = `/path/to/your/storage/directory/${profileImageRow.profile_image}`;
                    fs.unlinkSync(profileImagePath); // Delete the file synchronously
                }

                // Delete reviews related to the user
                const deleteReviewsQuery = "DELETE FROM reviews WHERE UserId = ?";
                db.query(deleteReviewsQuery, [userId]);

                // Delete user account
                const deleteUserAccountQuery = "DELETE FROM users WHERE UserId = ?";
                db.query(deleteUserAccountQuery, [userId]);

                res.status(200).json({ success: true, message: "User account deleted successfully" });
            }
        });


    } catch (error) {
        console.error("Error deleting user account:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { getUserDetails ,getUserProfile, updateUserProfile, deleteUserAccount };
