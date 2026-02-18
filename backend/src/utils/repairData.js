require('dotenv').config();
const mongoose = require('mongoose');
const Evidence = require('../models/Evidence');
const { getFlags } = require('../services/intelligenceService');

function s(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function mapType(meta, current) {
  const recordType = s(meta.Record_Type || meta.record_type || meta.type || current).toLowerCase();
  if (recordType.includes('call')) return 'call';
  if (recordType.includes('contact')) return 'contact';
  return 'chat';
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await Evidence.find();
  let updated = 0;

  for (const d of docs) {
    const m = d.metadata || {};
    const fromCandidate = s(
      d.from ||
      m.from || m.From || m.sender || m.Sender ||
      m.Contact_or_Number || m.contact_or_number ||
      m.Name_or_Number || m.name_or_number ||
      m.phone || m.number
    );
    const toCandidate = s(
      d.to ||
      m.to || m.To || m.receiver || m.Recipient ||
      m.to_number || m.toNumber
    );
    const message = s(
      m.Message_or_Activity || m.message_or_activity ||
      m.Message_Content || m.message_content ||
      m.message || m.content || d.content
    );
    const crypto = s(m.Crypto_Address || m.crypto_address);
    const url = s(m.URL || m.url || m.URL_Shared || m.url_shared);
    const merged = [message, crypto, url].filter(Boolean).join(' | ');

    d.type = mapType(m, d.type);
    d.from = fromCandidate;
    d.to = toCandidate;
    d.timestamp = s(d.timestamp || m.Date || m.date || m.Timestamp || m.timestamp);
    d.content = merged;
    d.source = s(d.source || m.Platform_or_CallType || m.platform || m.Platform || 'UFDR');
    d.flags = getFlags({ ...d.toObject(), metadata: m, content: d.content, from: d.from, to: d.to });

    await d.save();
    updated += 1;
  }

  const total = await Evidence.countDocuments();
  const withFrom = await Evidence.countDocuments({ from: { $ne: '' } });
  const withTo = await Evidence.countDocuments({ to: { $ne: '' } });
  const comm = await Evidence.countDocuments({ type: { $in: ['chat', 'call'] }, from: { $ne: '' } });
  console.log({ updated, total, withFrom, withTo, comm });
  await mongoose.disconnect();
})();
