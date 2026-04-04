const axios = require('axios');
const Vendor = require('../models/VendorNew');

// Optional integrations (Pinecone + OpenAI embeddings)
// Environment variables required for full integration:
// PINECONE_API_KEY, PINECONE_ENV, PINECONE_INDEX
// OPENAI_API_KEY (for embedding generation)

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV; // e.g., 'us-west1-gcp'
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'vendors';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function embedTextOpenAI(text) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const url = 'https://api.openai.com/v1/embeddings';
  const body = { model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small', input: text };
  const res = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    timeout: 8000
  });
  return res.data.data[0].embedding;
}

async function upsertBatchToPinecone(items) {
  if (!PINECONE_API_KEY || !PINECONE_ENV) throw new Error('Pinecone credentials missing');
  // items: [{ id: vendorId, vector: [...], metadata: { ... } }]
  const url = `https://${PINECONE_INDEX}-${PINECONE_ENV}.svc.pinecone.io/vectors/upsert`;
  const body = { vectors: items, namespace: process.env.PINECONE_NAMESPACE || '' };
  const res = await axios.post(url, body, {
    headers: { 'Api-Key': PINECONE_API_KEY, 'Content-Type': 'application/json' },
    timeout: 8000
  });
  return res.data;
}

async function queryPineconeByVector(vector, topK = 10) {
  if (!PINECONE_API_KEY || !PINECONE_ENV) throw new Error('Pinecone credentials missing');
  const url = `https://${PINECONE_INDEX}-${PINECONE_ENV}.svc.pinecone.io/query`;
  const body = { vector, topK, includeValues: false, includeMetadata: true, namespace: process.env.PINECONE_NAMESPACE || '' };
  const res = await axios.post(url, body, { headers: { 'Api-Key': PINECONE_API_KEY }, timeout: 8000 });
  return res.data; // contains matches with id, score, metadata
}

async function upsertAllVendorEmbeddings(batchSize = 100) {
  if (!OPENAI_API_KEY || !PINECONE_API_KEY) throw new Error('Embedding or vector DB credentials missing');
  let skip = 0;
  while (true) {
    const vendors = await Vendor.find({ isActive: true }).skip(skip).limit(batchSize).lean();
    if (!vendors || vendors.length === 0) break;
    const items = [];
    for (const v of vendors) {
      const text = [v.name, v.businessName, v.searchKeywords && v.searchKeywords.join(' '), v.description].filter(Boolean).join(' | ');
      const vector = await embedTextOpenAI(text);
      items.push({ id: v._id.toString(), values: vector, metadata: { name: v.name, serviceType: v.serviceType, city: v.city } });
    }
    await upsertBatchToPinecone(items);
    skip += vendors.length;
  }
  return true;
}

async function querySimilarVendors(queryText, topK = 10) {
  if (!OPENAI_API_KEY || !PINECONE_API_KEY) return [];
  try {
    const vector = await embedTextOpenAI(queryText);
    const res = await queryPineconeByVector(vector, topK);
    if (!res.matches) return [];
    return res.matches.map(m => ({ id: m.id, score: m.score, metadata: m.metadata }));
  } catch (err) {
    return [];
  }
}

module.exports = {
  embedTextOpenAI,
  upsertAllVendorEmbeddings,
  querySimilarVendors
};
