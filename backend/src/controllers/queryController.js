const Evidence = require("../models/Evidence");
const { questionToFilter } = require("../services/queryService");
const { generateAnswer } = require("../services/answerService");
const { buildSourceScopedQuery } = require("../utils/sourceScope");

const EXAMPLES = [
  "Show me chat records containing crypto addresses",
  "List all communications with foreign numbers",
  "Summarize suspicious activities from the last 30 days",
  "Show calls longer than 10 minutes",
  "Extract all URLs and links shared in chats"
];

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildEntityRegex(value = "") {
  const escaped = escapeRegex(value.trim());
  const wildcard = escaped.replace(/[Xx]/g, "\\d");
  return new RegExp(`^${wildcard}$`, "i");
}

function questionMentionsFlag(question = "", flag = "") {
  const q = question.toLowerCase();
  if (flag === "CRYPTO") return /crypto|bitcoin|wallet|eth|btc/.test(q);
  if (flag === "FOREIGN") return /foreign|international/.test(q);
  if (flag === "LINK") return /link|url|http/.test(q);
  if (flag === "LONG_CALL") return /long call|10 minute|duration/.test(q);
  return false;
}

async function queryEvidence(req, res) {
  try {
    const question = req.body?.question || "";
    const sourceScope = req.body?.sourceScope || "latest";
    const sourceFile = req.body?.sourceFile || "";
    if (!question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const { filter, dateFrom, provider, fallbackReason } = await questionToFilter(question);
    const mongoQuery = {};

    if (filter.type) mongoQuery.type = filter.type;

    const strictPairQuery = Boolean(filter.from && filter.to);
    const applyFlag = filter.flags && (!strictPairQuery || questionMentionsFlag(question, filter.flags));
    if (applyFlag) {
      mongoQuery.flags = filter.flags;
    }

    if (dateFrom) {
      mongoQuery.createdAt = { $gte: dateFrom };
    }

    if (question.toLowerCase().includes("suspicious") && !filter.flags) {
      mongoQuery.flags = { $in: ["CRYPTO", "FOREIGN", "LONG_CALL", "LINK"] };
    }

    if (filter.from && filter.to) {
      const fromRegex = buildEntityRegex(filter.from);
      const toRegex = buildEntityRegex(filter.to);
      mongoQuery.$or = [
        { $and: [{ from: fromRegex }, { to: toRegex }] },
        { $and: [{ from: toRegex }, { to: fromRegex }] }
      ];
    } else if (filter.from) {
      const fromRegex = buildEntityRegex(filter.from);
      mongoQuery.$or = [
        { from: fromRegex },
        { to: fromRegex }
      ];
    }

    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    Object.assign(mongoQuery, scoped.query);

    const results = await Evidence.find(mongoQuery).sort({ createdAt: -1 }).limit(250).lean();

    const scopedLabel =
      scoped.sourceScope === "all"
        ? "all files"
        : scoped.sourceScope === "file" && scoped.resolvedSourceFile
          ? `file ${scoped.resolvedSourceFile}`
          : "latest file";

    const summary = `${results.length} record(s) found for: ${question} (${scopedLabel})`;
    const answerObj = await generateAnswer({
      question,
      results,
      scopeLabel: scopedLabel
    });

    return res.json({
      question,
      interpreter: provider,
      interpreterNote: fallbackReason || null,
      interpretedFilter: filter,
      sourceScope: scoped.sourceScope,
      sourceFile: scoped.resolvedSourceFile || null,
      summary,
      answer: answerObj.answer,
      answerProvider: answerObj.provider,
      answerNote: answerObj.note || null,
      count: results.length,
      results
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Query failed" });
  }
}

async function cleanupInvalidRecords(_, res) {
  const result = await Evidence.deleteMany({
    $and: [
      { $or: [{ from: "" }, { from: { $exists: false } }] },
      { $or: [{ to: "" }, { to: { $exists: false } }] },
      { $or: [{ content: "" }, { content: { $exists: false } }] },
      { $or: [{ timestamp: "" }, { timestamp: { $exists: false } }] }
    ]
  });
  res.json({ deletedCount: result.deletedCount || 0 });
}

function getQueryExamples(_, res) {
  res.json({ examples: EXAMPLES });
}

async function getQuerySources(_, res) {
  const items = await Evidence.aggregate([
    { $match: { sourceFile: { $nin: [null, ""] } } },
    {
      $group: {
        _id: "$sourceFile",
        count: { $sum: 1 },
        latestAt: { $max: "$createdAt" }
      }
    },
    { $sort: { latestAt: -1 } },
    {
      $project: {
        _id: 0,
        sourceFile: "$_id",
        count: 1,
        latestAt: 1
      }
    }
  ]);

  res.json({ sources: items });
}

module.exports = { queryEvidence, getQueryExamples, getQuerySources, cleanupInvalidRecords };
