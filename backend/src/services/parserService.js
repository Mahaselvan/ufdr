const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xml2js = require("xml2js");

function safeString(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return safeString(value[0]);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function normalizeType(value) {
  const text = safeString(value).toLowerCase();
  if (text.includes("chat") || text.includes("message")) return "chat";
  if (text.includes("call")) return "call";
  if (text.includes("contact")) return "contact";
  return "chat";
}

function normalizeRecord(raw, sourceFile) {
  const lowerMap = {};
  Object.keys(raw || {}).forEach((k) => {
    lowerMap[String(k).toLowerCase().replace(/[\s_-]+/g, "")] = raw[k];
  });
  const pick = (...keys) => {
    for (const key of keys) {
      const normalized = key.toLowerCase().replace(/[\s_-]+/g, "");
      if (raw?.[key] !== undefined) return raw[key];
      if (lowerMap[normalized] !== undefined) return lowerMap[normalized];
    }
    return undefined;
  };

  const type = normalizeType(
    pick("type", "recordType", "record_type", "Record_Type", "category", "kind")
  );
  const contactOrNumber = safeString(
    pick(
      "contact_or_number",
      "Contact_or_Number",
      "name_or_number",
      "Name_or_Number",
      "contact",
      "phone",
      "number",
      "phonenumber"
    )
  );
  const messageText = safeString(
    pick(
      "message_or_activity",
      "Message_or_Activity",
      "message_content",
      "Message_Content",
      "content",
      "message",
      "text",
      "note",
      "body"
    )
  );
  const cryptoAddress = safeString(pick("crypto_address", "Crypto_Address"));
  const url = safeString(pick("url", "URL", "url_shared", "URL_Shared"));
  const mergedContent = [messageText, cryptoAddress, url].filter(Boolean).join(" | ");

  return {
    type,
    from: safeString(
      pick(
        "from",
        "sender",
        "source",
        "phone",
        "number",
        "phonenumber",
        "fromnumber"
      ) || contactOrNumber
    ),
    to: safeString(pick("to", "receiver", "destination", "target", "tonumber", "recipient")),
    timestamp: safeString(pick("timestamp", "time", "date", "datetime", "createdat", "Date")),
    content: mergedContent || safeString(pick("content", "message", "text", "note", "body", "messagetext")),
    country: safeString(pick("country", "region", "isoCountry")),
    durationSeconds: Number(pick("durationSeconds", "duration", "callDuration", "durationsec") || 0) || 0,
    source: safeString(
      pick("source", "platform", "app", "Platform_or_CallType", "platform_or_calltype") || "UFDR"
    ),
    sourceFile,
    metadata: raw
  };
}

async function parseJsonFile(filePath, sourceFileName) {
  const sourceFile = sourceFileName || path.basename(filePath);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed.records || parsed.evidence || parsed.items || [];

  return rows.map((row) => normalizeRecord(row, sourceFile));
}

async function parseXmlFile(filePath, sourceFileName) {
  const sourceFile = sourceFileName || path.basename(filePath);
  const xml = fs.readFileSync(filePath, "utf8");
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  const data = await parser.parseStringPromise(xml);

  const root = data.ufdr || data.records || data.export || data;
  const rows = root.record || root.records || root.item || root.items || [];
  const normalizedRows = Array.isArray(rows) ? rows : [rows];

  return normalizedRows.filter(Boolean).map((row) => normalizeRecord(row, sourceFile));
}

function parseCsvFile(filePath, sourceFileName) {
  const sourceFile = sourceFileName || path.basename(filePath);

  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(normalizeRecord(row, sourceFile)))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseUfdrXmlObjects(root, sourceFile) {
  const out = [];
  const candidates = [];

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    candidates.push(node);
    Object.values(node).forEach(walk);
  }

  walk(root);
  for (const obj of candidates) {
    const record = normalizeRecord(obj, sourceFile);
    if (record.from || record.to || record.content || record.timestamp) {
      out.push(record);
    }
  }

  return out;
}

async function parseUfdrFile(filePath, sourceFileName) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8");
  const trimmed = raw.trimStart();
  const source = sourceFileName || path.basename(filePath);

  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
    try {
      return await parseXmlFile(filePath, source);
    } catch (_) {
      // try broad xml extraction fallback for non-standard UFDR xml shape
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const data = await parser.parseStringPromise(raw);
      return parseUfdrXmlObjects(data, source);
    }
  }

  if (ext === ".json") return parseJsonFile(filePath, sourceFileName);
  if (ext === ".xml") return parseXmlFile(filePath, sourceFileName);
  if (ext === ".csv") return parseCsvFile(filePath, sourceFileName);

  throw new Error("Unsupported file type. Use XML, CSV, or JSON.");
}

module.exports = { parseUfdrFile };
