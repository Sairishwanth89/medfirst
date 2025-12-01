const { Client } = require('@elastic/elasticsearch');

const ES_HOST = process.env.ELASTICSEARCH_HOST || 'medicine-elasticsearch';
const ES_PORT = process.env.ELASTICSEARCH_PORT || 9200;
const ES_USER = process.env.ELASTICSEARCH_USERNAME || '';
const ES_PASS = process.env.ELASTICSEARCH_PASSWORD || '';
const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || 'medicines';

const node = `http://${ES_HOST}:${ES_PORT}`;

if (!global.__ES_CLIENT__) {
  const opts = { node };
  if (ES_USER && ES_PASS) opts.auth = { username: ES_USER, password: ES_PASS };
  global.__ES_CLIENT__ = new Client(opts);
}
const esClient = global.__ES_CLIENT__;

async function waitForElasticsearch(retries = 6, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await esClient.ping();
      return true;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`ES not ready (attempt ${i + 1}/${retries}), retrying in ${delayMs}ms`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function createIndexIfMissing() {
  try {
    const { body: exists } = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ELASTICSEARCH_INDEX,
        body: {
          mappings: {
            properties: {
              name: { type: 'text' },
              generic_name: { type: 'text' },
              description: { type: 'text' },
              manufacturer: { type: 'keyword' },
              unit_price: { type: 'float' },
              stock_quantity: { type: 'integer' },
              pharmacy_id: { type: 'keyword' }
            }
          }
        }
      });
      console.log(`Created ES index: ${ELASTICSEARCH_INDEX}`);
    }
  } catch (err) {
    console.error('createIndexIfMissing error:', err?.message || err);
    throw err;
  }
}

module.exports = { esClient, ELASTICSEARCH_INDEX, waitForElasticsearch, createIndexIfMissing };