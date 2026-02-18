function parseDateConstraint(question) {
  const q = question.toLowerCase();
  const now = new Date();

  if (q.includes("last week")) {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return from;
  }

  const lastDaysMatch = q.match(/last\s+(\d+)\s+days?/);
  if (lastDaysMatch) {
    const days = Number(lastDaysMatch[1]);
    if (!Number.isNaN(days)) {
      const from = new Date(now);
      from.setDate(now.getDate() - days);
      return from;
    }
  }

  return null;
}

function extractEntities(question) {
  const text = question || "";
  const phoneLike = text.match(/\+?[0-9][0-9Xx-]{6,}[0-9Xx]/g) || [];
  const handles = text.match(/@[A-Za-z0-9_\.\-]+/g) || [];
  const entities = [...new Set([...phoneLike, ...handles].map((e) => e.trim()))];

  return {
    from: entities[0] || null,
    to: entities[1] || null,
    entities
  };
}

function localQuestionToFilter(question) {
  const q = (question || "").toLowerCase();
  const filter = {};
  const entities = extractEntities(question);

  if (q.includes("chat")) filter.type = "chat";
  if (q.includes("call")) filter.type = "call";
  if (q.includes("contact")) filter.type = "contact";

  if (q.includes("crypto") || q.includes("bitcoin") || q.includes("wallet")) {
    filter.flags = "CRYPTO";
  }

  if (q.includes("foreign") || q.includes("international")) {
    filter.flags = "FOREIGN";
  }

  if (q.includes("link") || q.includes("url")) {
    filter.flags = "LINK";
  }

  if (q.includes("long call") || q.includes("10 minute")) {
    filter.type = "call";
    filter.flags = "LONG_CALL";
  }

  if (entities.from) filter.from = entities.from;
  if (entities.to) filter.to = entities.to;

  const dateFrom = parseDateConstraint(q);
  return { filter, dateFrom };
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

async function hfQuestionToFilter(question) {
  const token = process.env.HF_ACCESS_TOKEN;
  const preferredModel = process.env.HF_MODEL || "google/gemma-2-2b-it";
  const modelCandidates = [
    preferredModel,
    "meta-llama/Llama-3.1-8B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "microsoft/Phi-3-mini-4k-instruct",
    "HuggingFaceH4/zephyr-7b-beta"
  ];

  if (!token) {
    return null;
  }

  const prompt =
    "Convert the investigation question into strict JSON with keys: type, flag, days, from, to. " +
    'Rules: type in ["chat","call","contact"] or null; flag in ["CRYPTO","FOREIGN","LINK","LONG_CALL"] or null; days integer or null; from/to as exact entities if present else null. ' +
    "Return JSON only, no markdown, no explanation.";

  let lastError = null;
  let parsed = null;
  let usedModel = null;

  for (const model of modelCandidates) {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: question }
        ],
        max_tokens: 140,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const text = await response.text();
      lastError = `model=${model} status=${response.status} body=${text.slice(0, 160)}`;
      continue;
    }

    const data = await response.json();
    const generated = data?.choices?.[0]?.message?.content || JSON.stringify(data);
    parsed = extractJsonObject(generated);
    if (parsed) {
      usedModel = model;
      break;
    }
    lastError = `model=${model} returned non-JSON output`;
  }

  if (!parsed) {
    throw new Error(`HF inference failed: ${lastError || "no model produced valid JSON"}`);
  }

  const filter = {};
  if (["chat", "call", "contact"].includes(parsed.type)) {
    filter.type = parsed.type;
  }
  if (["CRYPTO", "FOREIGN", "LINK", "LONG_CALL"].includes(parsed.flag)) {
    filter.flags = parsed.flag;
  }
  if (typeof parsed.from === "string" && parsed.from.trim()) {
    filter.from = parsed.from.trim();
  }
  if (typeof parsed.to === "string" && parsed.to.trim()) {
    filter.to = parsed.to.trim();
  }

  let dateFrom = null;
  if (Number.isInteger(parsed.days) && parsed.days > 0) {
    dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parsed.days);
  }

  const localEntities = extractEntities(question);
  if (!filter.from && localEntities.from) filter.from = localEntities.from;
  if (!filter.to && localEntities.to) filter.to = localEntities.to;

  return { filter, dateFrom, provider: `huggingface:${usedModel}` };
}

async function questionToFilter(question) {
  try {
    const hfResult = await hfQuestionToFilter(question);
    if (hfResult) return hfResult;
  } catch (error) {
    // Fallback to local rule parsing
    return { ...localQuestionToFilter(question), provider: "rules", fallbackReason: error.message };
  }

  const local = localQuestionToFilter(question);
  return { ...local, provider: "rules" };
}

module.exports = { questionToFilter, extractEntities };
