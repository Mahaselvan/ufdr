const fs = require("fs");
const Evidence = require("../models/Evidence");
const { parseUfdrFile } = require("../services/parserService");
const { getFlags } = require("../services/intelligenceService");

async function uploadUfdr(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const parsed = await parseUfdrFile(req.file.path, req.file.originalname);

    const toInsert = parsed
      .filter((record) => ["chat", "call", "contact"].includes(record.type))
      .filter((record) => record.from || record.to || record.content || record.timestamp)
      .map((record) => ({
        ...record,
        flags: getFlags(record),
        isDemoData: false
      }));

    if (!toInsert.length) {
      return res.status(400).json({
        error: "No supported records found. Expected chats, calls, or contacts."
      });
    }

    await Evidence.deleteMany({ isDemoData: true });
    await Evidence.insertMany(toInsert);

    fs.unlink(req.file.path, () => {});

    return res.json({
      message: "UFDR file processed",
      fileName: req.file.originalname,
      ingested: toInsert.length,
      breakdown: {
        chat: toInsert.filter((r) => r.type === "chat").length,
        call: toInsert.filter((r) => r.type === "call").length,
        contact: toInsert.filter((r) => r.type === "contact").length
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Upload failed" });
  }
}

module.exports = { uploadUfdr };
