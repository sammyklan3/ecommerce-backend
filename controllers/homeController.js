const home = async(req, res) => {
    res.status(200).json({ success: true, message: "Welcome"});
}

module.exports = home;