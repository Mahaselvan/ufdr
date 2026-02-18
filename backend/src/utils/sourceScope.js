const Evidence = require("../models/Evidence");

async function buildSourceScopedQuery(sourceScope = "latest", sourceFile = "") {
  const query = {};

  if (sourceScope === "file" && sourceFile) {
    query.sourceFile = sourceFile;
    return { query, resolvedSourceFile: sourceFile, sourceScope: "file" };
  }

  if (sourceScope === "latest") {
    const latest = await Evidence.findOne({ sourceFile: { $nin: [null, ""] } })
      .sort({ createdAt: -1 })
      .select("sourceFile")
      .lean();

    if (latest?.sourceFile) {
      query.sourceFile = latest.sourceFile;
      return { query, resolvedSourceFile: latest.sourceFile, sourceScope: "latest" };
    }

    return { query, resolvedSourceFile: null, sourceScope: "all" };
  }

  return { query, resolvedSourceFile: null, sourceScope: "all" };
}

module.exports = { buildSourceScopedQuery };
