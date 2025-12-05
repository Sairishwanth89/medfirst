require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../config/db');

const CSV_FILE = path.join(__dirname, '../data/medicines.csv');

async function importData() {
  await connectDB();
  console.log('connected to DB...');
  
  const products = [];

  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
      // Map CSV columns to Schema fields
      // Generate a random price between 50 and 500 since CSV doesn't have it
      const randomPrice = (Math.random() * (500 - 50) + 50).toFixed(2);
      
      products.push({
        name: row['Medicine Name'],
        composition: row['Composition'],
        uses: row['Uses'],
        side_effects: row['Side_effects'],
        image_url: row['Image URL'],
        manufacturer: row['Manufacturer'],
        reviews: {
          excellent: parseInt(row['Excellent Review %'] || 0),
          average: parseInt(row['Average Review %'] || 0),
          poor: parseInt(row['Poor Review %'] || 0)
        },
        price: parseFloat(randomPrice),
        stock: 100, // Default stock
        pharmacyId: '65f2e...', // Optional: Hardcode a pharmacy ID or leave blank
      });
    })
    .on('end', async () => {
      console.log(`Parsing complete. Found ${products.length} entries.`);
      try {
        // Optional: Clear existing products
        // await Product.deleteMany({}); 
        
        // Insert in chunks
        await Product.insertMany(products);
        console.log('✅ Data successfully imported!');
      } catch (err) {
        console.error('Error importing data:', err);
      } finally {
        mongoose.connection.close();
      }
    });
}

importData();