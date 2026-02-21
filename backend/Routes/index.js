const express = require("express");
const router = express.Router();
const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application=require("./application")
const posts = require("./posts");
const auth = require("./auth");
const subscription = require("./subscription");
const razorpaySubscription = require("./razorpay-subscription");
const resume = require("./resume");
const resumeRazorpay = require("./resume-razorpay");
const language = require("./language");
const friends = require("./friends");
const upload = require("./upload");
const messages = require("./messages");

router.use("/admin", admin);
router.use("/internship", intern);
router.use("/job", job);
router.use("/application", application);
router.use("/posts", posts);
router.use("/auth", auth);
router.use("/subscription", subscription);
router.use("/razorpay-subscription", razorpaySubscription);
router.use("/resume", resume);
router.use("/resume-razorpay", resumeRazorpay);
router.use("/language", language);
router.use("/friends", friends);
router.use("/upload", upload);
router.use("/messages", messages);

module.exports = router;
