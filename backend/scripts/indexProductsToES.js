// Bulk-index products from MongoDB -> Elasticsearch (safe, resumable)
const mongoose = require('mongoose');

async function main() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/medifind';
    const INDEX = process.env.ELASTICSEARCH_PRODUCTS_INDEX || 'products';
    const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
    const RECREATE = !!process.env.RECREATE_INDEX;

    const { esClient } = require('../config/elasticsearch');

    // connect to Mongo
    await mongoose.connect(MONGO_URI, { dbName: 'medifind' });
    console.log('Connected to Mongo:', MONGO_URI);

    // ensure ES reachable
    try {
      await esClient.ping();
      console.log('Elasticsearch reachable');
    } catch (err) {
      console.error('Elasticsearch ping failed:', err?.message || err);
      process.exit(2);
    }

    // index management
    const exists = (await esClient.indices.exists({ index: INDEX })).body;
    if (RECREATE && exists) {
      console.log(`Deleting existing index "${INDEX}"`);
      await esClient.indices.delete({ index: INDEX });
    }

    if (!exists || RECREATE) {
      console.log(`Creating index "${INDEX}"`);
      await esClient.indices.create({
        index: INDEX,
        body: {
          mappings: {
            properties: {
              display_name: { type: 'text' },
              manufacturer_name: { type: 'text' },
              composition_short: { type: 'text' },
              pack_desc: { type: 'text' },
              keywords: { type: 'text' },
              image_url: { type: 'keyword' },
              is_prescription_required: { type: 'boolean' },
              pharmacyId: { type: 'keyword' }
            }
          }
        }
      }).catch(e => console.warn('Index create warning:', e?.message || e));
    } else {
      console.log(`Index "${INDEX}" already exists`);
    }

    const db = mongoose.connection;
    const col = db.collection('products');
    const total = await col.countDocuments();
    if (!total) {
      console.log('No documents to index in products collection');
      process.exit(0);
    }
    console.log(`Found ${total} products — indexing in batches of ${BATCH_SIZE}`);

    const cursor = col.find({}, { batchSize: BATCH_SIZE });
    let bulk = [];
    let processed = 0;
    let batchNum = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const id = String(doc._id);
      const source = {
        display_name: doc.display_name || doc.name || '',
        manufacturer_name: doc.manufacturer_name || '',
        composition_short: doc.composition_short || '',
        pack_desc: doc.pack_desc || '',
        keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
        image_url: doc.image_url || '',
        is_prescription_required: !!doc.is_prescription_required,
        pharmacyId: doc.pharmacyId ? String(doc.pharmacyId) : (doc.pharmacyId || '')
      };

      bulk.push({ index: { _index: INDEX, _id: id } }, source);

      if (bulk.length / 2 >= BATCH_SIZE) {
        batchNum++;
        const resp = await esClient.bulk({ refresh: true, body: bulk });
        if (resp.body?.errors) {
          console.warn('Bulk response contained errors on batch', batchNum);
        }
        processed += bulk.length / 2;
        console.log(`Flushed batch #${batchNum} — processed ${processed}/${total}`);
        bulk = [];
      }
    }

    if (bulk.length) {
      batchNum++;
      const resp = await esClient.bulk({ refresh: true, body: bulk });
      if (resp.body?.errors) console.warn('Final bulk contained errors');
      processed += bulk.length / 2;
      console.log(`Flushed final batch #${batchNum} — processed ${processed}/${total}`);
    }

    // verify - refresh + robust count handling
    await esClient.indices.refresh({ index: INDEX }).catch(() => {});
    const countResp = await esClient.count({ index: INDEX }).catch(err => {
      console.warn('esClient.count error:', err?.message || err);
      return null;
    });
    const esCount = (countResp && ((countResp.body && countResp.body.count) ?? countResp.count)) ?? 0;
    console.log(`Elasticsearch index "${INDEX}" contains ${esCount} documents`);
    
    await mongoose.disconnect();
    console.log('Indexing complete');
    process.exit(0);
  } catch (err) {
    console.error('Indexing failed:', err?.message || err);
    process.exit(1);
  }
}

main();