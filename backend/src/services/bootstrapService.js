const path = require("path");
const fs = require("fs");
const Evidence = require("../models/Evidence");
const { getFlags } = require("./intelligenceService");

async function ensureDemoData() {
  const total = await Evidence.countDocuments();
  if (total > 0) {
    return;
  }

  const filePath = path.join(process.cwd(), "..", "data", "sample-ufdr.json");
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const items = JSON.parse(raw);
  const docs = items.map((item) => ({
    ...item,
    sourceFile: "sample-ufdr.json",
    flags: getFlags(item),
    isDemoData: true,
    metadata: item
  }));

  if (docs.length) {
    await Evidence.insertMany(docs);
    console.log(`Loaded ${docs.length} demo records for dashboard showcase.`);
  }
}

module.exports = { ensureDemoData };
