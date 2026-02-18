const express = require("express");
const { getReports, createReport } = require("../controllers/reportController");

const router = express.Router();

router.get("/reports", getReports);
router.post("/reports/generate", createReport);

module.exports = router;
