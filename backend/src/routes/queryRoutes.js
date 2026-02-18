const express = require("express");
const {
  queryEvidence,
  getQueryExamples,
  getQuerySources,
  cleanupInvalidRecords
} = require("../controllers/queryController");

const router = express.Router();

router.post("/query", queryEvidence);
router.get("/query/examples", getQueryExamples);
router.get("/query/sources", getQuerySources);
router.post("/query/cleanup-invalid", cleanupInvalidRecords);

module.exports = router;
