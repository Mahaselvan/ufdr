require("dotenv").config();
const path = require("path");
const fs = require("fs");

const { connectDB } = require("../config/db");
const Evidence = require("../models/Evidence");
const { getFlags } = require("../services/intelligenceService");

async function seed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ufdr_ai";
  await connectDB(mongoUri);

  const filePath = path.join(process.cwd(), "..", "data", "sample-ufdr.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const records = JSON.parse(raw);

  await Evidence.deleteMany({ isDemoData: true });

  const docs = records.map((r) => ({
    ...r,
    sourceFile: "sample-ufdr.json",
    flags: getFlags(r),
    isDemoData: true,
    metadata: r
  }));

  await Evidence.insertMany(docs);

  console.log(`Seeded ${docs.length} records from ${filePath}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
