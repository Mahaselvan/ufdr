const express = require("express");
const {
  getDashboard,
  getLinks,
  getRecentActivity
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/dashboard", getDashboard);
router.get("/links", getLinks);
router.get("/activity", getRecentActivity);

module.exports = router;
