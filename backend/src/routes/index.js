const express = require("express");

const uploadRoutes = require("./uploadRoutes");
const queryRoutes = require("./queryRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const reportRoutes = require("./reportRoutes");

const router = express.Router();

router.use(uploadRoutes);
router.use(queryRoutes);
router.use(dashboardRoutes);
router.use(reportRoutes);

module.exports = router;
