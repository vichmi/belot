const router = require('express').Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

router.get("/profile", (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { username } = decoded;
    db.query(
      "SELECT profile_image FROM users WHERE username = ?",
      [username],
        (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database error" });
        }
        if (result.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        const profileImage = result[0].profile_image;
        let base64Image = null;
        if (profileImage) {
          base64Image = `data:image/png;base64,${profileImage.toString("base64")}`;
        }
        res.json({ profile: base64Image });
        }
    );
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid token" });
  }
});

router.put("/profile", (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { username } = decoded;

    // base64 string like: data:image/png;base64,iVBORw0KGgo...
    const base64Data = req.body.profile;

    if (!base64Data) {
      return res.status(400).json({ message: "No image provided" });
    }

    // remove header (data:image/png;base64,)
    const imageBuffer = Buffer.from(
      base64Data.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    db.query(
      "UPDATE users SET profile_image = ? WHERE username = ?",
      [imageBuffer, username],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database error" });
        }
        res.json({ message: "Profile updated successfully" });
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid token" });
  }
});


module.exports = router;