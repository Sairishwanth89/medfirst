const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || '', // If authentication is enabled
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  }
});

const ELASTICSEARCH_INDEX = 'medicines';

const createIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });
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
      console.log(`Elasticsearch index "${ELASTICSEARCH_INDEX}" created.`);
    }
  } catch (error) {
    console.error('Error creating Elasticsearch index:', error);
  }
};

module.exports = { esClient, ELASTICSEARCH_INDEX, createIndex };