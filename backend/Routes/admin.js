const express = require("express");
const router = express.Router();
const adminuser = "admin";
const adminpass = "admin";

router.post("/adminlogin", (req, res) => {
  const { username, password } = req.body;
  // Simple auth - update with proper Firebase auth later
  if (username === "admin" && password === "admin") {
    res.json({ success: true, message: "Admin login successful", token: "admin-token-123" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});
module.exports = router;
