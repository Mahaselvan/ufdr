const Evidence = require("../models/Evidence");
const { buildSourceScopedQuery } = require("../utils/sourceScope");

async function getDashboard(req, res) {
  try {
    const sourceScope = req.query?.sourceScope || "all";
    const sourceFile = req.query?.sourceFile || "";
    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    const q = scoped.query;

    const [
      totalRecords,
      totalChats,
      totalCalls,
      totalContacts,
      foreignCount,
      cryptoCount,
      longCalls,
      distinctContacts,
      recent
    ] = await Promise.all([
      Evidence.countDocuments(q),
      Evidence.countDocuments({ ...q, type: "chat" }),
      Evidence.countDocuments({ ...q, type: "call" }),
      Evidence.countDocuments({ ...q, type: "contact" }),
      Evidence.countDocuments({ ...q, flags: "FOREIGN" }),
      Evidence.countDocuments({ ...q, flags: "CRYPTO" }),
      Evidence.countDocuments({ ...q, flags: "LONG_CALL" }),
      Evidence.distinct("from", q),
      Evidence.find(q).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const demoCount = await Evidence.countDocuments({ ...q, isDemoData: true });

    return res.json({
      metrics: {
        totalRecords,
        totalChats,
        totalCalls,
        totalContacts,
        foreignCount,
        cryptoCount,
        longCalls,
        uniqueFromContacts: distinctContacts.filter(Boolean).length
      },
      isDemoData: totalRecords > 0 && demoCount === totalRecords,
      sourceScope: scoped.sourceScope,
      sourceFile: scoped.resolvedSourceFile || null,
      recentActivity: recent.map((item) => ({
        id: item._id,
        title: `${item.type.toUpperCase()} from ${item.from || "Unknown"}`,
        detail: item.content || item.to || "No detail",
        timestamp: item.createdAt,
        sourceFile: item.sourceFile
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Dashboard failed" });
  }
}

async function getLinks(req, res) {
  try {
    const sourceScope = req.query?.sourceScope || "latest";
    const sourceFile = req.query?.sourceFile || "";
    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);

    const communications = await Evidence.find({
      ...scoped.query,
      type: { $in: ["chat", "call"] }
    })
      .select("from to flags source metadata")
      .lean();

    const edgeMap = new Map();
    const nodeMap = new Map();

    for (const row of communications) {
      const a =
        (row.from || "").trim() ||
        (row.metadata?.name_or_number || row.metadata?.Name_or_Number || row.metadata?.Contact_or_Number || "").trim();
      const b =
        (row.to || "").trim() ||
        (row.metadata?.to || row.metadata?.To || row.metadata?.recipient || "").trim();
      const platform = (row.source || row.metadata?.platform || row.metadata?.Platform_or_CallType || "UFDR").trim();

      const sourceNode = a || `APP:${platform}`;
      const targetNode = b || (a ? `APP:${platform}` : "");
      if (!sourceNode || !targetNode || sourceNode === targetNode) {
        continue;
      }

      const aLabel = sourceNode.startsWith("APP:") ? sourceNode.replace("APP:", "") : sourceNode;
      const bLabel = targetNode.startsWith("APP:") ? targetNode.replace("APP:", "") : targetNode;
      const key = [a, b].sort().join("::");

      const edgeKey = [sourceNode, targetNode].sort().join("::");
      const current = edgeMap.get(edgeKey) || {
        source: sourceNode,
        target: targetNode,
        weight: 0,
        flags: new Set()
      };
      current.weight += 1;
      (row.flags || []).forEach((flag) => current.flags.add(flag));
      edgeMap.set(edgeKey, current);

      [sourceNode, targetNode].forEach((number, idx) => {
        const label = idx === 0 ? aLabel : bLabel;
        const isApp = number.startsWith("APP:");
        const node = nodeMap.get(number) || {
          id: number,
          label,
          connections: 0,
          type: isApp ? "app" : number.startsWith("+") && !number.startsWith("+91") ? "foreign" : "local"
        };
        node.connections += 1;
        nodeMap.set(number, node);
      });
    }

    const edges = Array.from(edgeMap.values()).map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      flags: Array.from(edge.flags)
    }));

    const nodes = Array.from(nodeMap.values()).map((node) => ({
      ...node,
      size: Math.max(8, Math.min(42, node.connections * 2))
    }));

    return res.json({
      nodes,
      edges,
      sourceScope: scoped.sourceScope,
      sourceFile: scoped.resolvedSourceFile || null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Link analysis failed" });
  }
}

async function getRecentActivity(req, res) {
  const sourceScope = req.query?.sourceScope || "all";
  const sourceFile = req.query?.sourceFile || "";
  const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
  const recent = await Evidence.find(scoped.query).sort({ createdAt: -1 }).limit(10).lean();
  res.json({
    items: recent.map((item) => ({
      id: item._id,
      action: `${item.type.toUpperCase()} analyzed`,
      subject: item.sourceFile || "UFDR import",
      createdAt: item.createdAt
    }))
  });
}

module.exports = { getDashboard, getLinks, getRecentActivity };
