const PDFDocument = require("pdfkit");
const Evidence = require("../models/Evidence");
const { buildSourceScopedQuery } = require("../utils/sourceScope");
const { generateAnswer } = require("../services/answerService");

function sanitizeFileName(name) {
  return String(name || "report").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function escapeCsv(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replace(/\"/g, "\"\"")}"`;
  }
  return str;
}

async function getReports(req, res) {
  const sourceScope = req.query?.sourceScope || "all";
  const sourceFile = req.query?.sourceFile || "";
  const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);

  const totalRecords = await Evidence.countDocuments(scoped.query);
  const cryptoCount = await Evidence.countDocuments({ ...scoped.query, flags: "CRYPTO" });
  const foreignCount = await Evidence.countDocuments({ ...scoped.query, flags: "FOREIGN" });

  const files = await Evidence.aggregate([
    { $match: { ...scoped.query, sourceFile: { $nin: [null, ""] } } },
    { $group: { _id: "$sourceFile", records: { $sum: 1 }, latestAt: { $max: "$createdAt" } } },
    { $sort: { latestAt: -1 } },
    { $limit: 8 },
    { $project: { _id: 0, sourceFile: "$_id", records: 1, latestAt: 1 } }
  ]);

  res.json({
    summary: {
      totalRecords,
      cryptoCount,
      foreignCount
    },
    sourceScope: scoped.sourceScope,
    sourceFile: scoped.resolvedSourceFile || null,
    reports: files.map((f, i) => ({
      id: `rep-${i + 1}`,
      name: `${f.sourceFile.replace(/\.[^.]+$/, "")}_report.pdf`,
      createdAt: f.latestAt,
      size: `${Math.max(1, Math.round(f.records / 20))}.${(f.records % 10)} MB`
    }))
  });
}

async function createReport(req, res) {
  const {
    template = "Full Investigation Report",
    format = "PDF",
    sourceScope = "latest",
    sourceFile = "",
    question = ""
  } = req.body || {};

  const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
  const records = await Evidence.find(scoped.query)
    .sort({ createdAt: -1 })
    .limit(250)
    .lean();

  const scopedLabel =
    scoped.sourceScope === "all"
      ? "all files"
      : scoped.sourceScope === "file" && scoped.resolvedSourceFile
        ? `file ${scoped.resolvedSourceFile}`
        : "latest file";

  const answerObj = await generateAnswer({
    question: question.trim() || "Summarize evidence in scope",
    results: records,
    scopeLabel: scopedLabel
  });

  const generatedAt = new Date();
  const baseName = sanitizeFileName(
    `Investigation_Report_${generatedAt.toISOString().slice(0, 10)}_${scoped.resolvedSourceFile || scoped.sourceScope}`
  );

  if (format.toUpperCase() === "CSV") {
    const cryptoCount = records.filter((r) => (r.flags || []).includes("CRYPTO")).length;
    const foreignCount = records.filter((r) => (r.flags || []).includes("FOREIGN")).length;
    const longCallCount = records.filter((r) => (r.flags || []).includes("LONG_CALL")).length;

    const header = [
      "answer",
      "answerProvider",
      "scope",
      "totalRecords",
      "cryptoCount",
      "foreignCount",
      "longCallCount",
      "generatedAt"
    ];
    const row = [
      escapeCsv(answerObj.answer),
      escapeCsv(answerObj.provider),
      escapeCsv(scopedLabel),
      escapeCsv(records.length),
      escapeCsv(cryptoCount),
      escapeCsv(foreignCount),
      escapeCsv(longCallCount),
      escapeCsv(generatedAt.toISOString())
    ];

    const csv = [header.join(","), row.join(",")].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=\"${baseName}.csv\"`);
    return res.send(csv);
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${baseName}.pdf\"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(18).text("UFDR AI Investigation Report", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Template: ${template}`);
  doc.text(`Generated at: ${generatedAt.toISOString()}`);
  doc.text(`Scope: ${scoped.sourceScope}${scoped.resolvedSourceFile ? ` (${scoped.resolvedSourceFile})` : ""}`);
  doc.text(`Total records included: ${records.length}`);
  doc.moveDown(1);

  const cryptoCount = records.filter((r) => (r.flags || []).includes("CRYPTO")).length;
  const foreignCount = records.filter((r) => (r.flags || []).includes("FOREIGN")).length;
  const longCallCount = records.filter((r) => (r.flags || []).includes("LONG_CALL")).length;

  doc.fontSize(13).text("Answer", { underline: true });
  doc.fontSize(11).text(answerObj.answer || "No answer generated.");
  doc.text(`Answer Engine: ${answerObj.provider || "rules"}`);
  if (answerObj.note) {
    doc.text(`Answer fallback: ${answerObj.note}`);
  }
  doc.moveDown(1);

  doc.fontSize(13).text("Summary", { underline: true });
  doc.fontSize(11).text(`Crypto flagged: ${cryptoCount}`);
  doc.text(`Foreign communications: ${foreignCount}`);
  doc.text(`Long calls: ${longCallCount}`);
  doc.moveDown(1);

  doc.end();
}

module.exports = { getReports, createReport };
