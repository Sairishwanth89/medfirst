require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User'); // Import User model to find pharmacy
const connectDB = require('../config/db');

const CSV_FILE = path.join(__dirname, '../data/medicines.csv');

async function importData() {
  await connectDB();
  console.log('✓ Connected to DB');
  
  try {
    // 1. Find the Pharmacy User (Assign inventory to the first pharmacy found)
    const pharmacyUser = await User.findOne({ role: 'pharmacy' });
    
    if (!pharmacyUser) {
      console.error('❌ No user with role "pharmacy" found. Please sign up as a pharmacy first!');
      process.exit(1);
    }
    console.log(`ℹ️ Importing inventory for Pharmacy: ${pharmacyUser.username} (${pharmacyUser._id})`);

    const products = [];

    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (row) => {
        // Generate random price and stock
        const randomPrice = (Math.random() * (500 - 50) + 50).toFixed(2);
        
        products.push({
          name: row['Medicine Name'],
          generic_name: row['Composition'] || '', // Map Composition to generic_name
          description: row['Uses'] || '',
          side_effects: row['Side_effects'] || '',
          image_url: row['Image URL'] || '',
          manufacturer: row['Manufacturer'],
          category: 'over_the_counter', // Default category
          unit_price: parseFloat(randomPrice),
          stock_quantity: 100, // Default stock (Use this field name!)
          pharmacy_id: pharmacyUser._id, // Link to your pharmacy
          reviews: {
            excellent: parseInt(row['Excellent Review %'] || 0),
            average: parseInt(row['Average Review %'] || 0),
            poor: parseInt(row['Poor Review %'] || 0)
          }
        });
      })
      .on('end', async () => {
        console.log(`✓ Parsed ${products.length} entries.`);
        
        // Clear old data for this pharmacy to avoid duplicates
        await Product.deleteMany({ pharmacy_id: pharmacyUser._id });
        console.log('✓ Cleared old inventory');

        // Insert new data
        await Product.insertMany(products);
        console.log('✅ Data successfully imported into your Pharmacy Inventory!');
        mongoose.connection.close();
      });

  } catch (err) {
    console.error('Error:', err);
    mongoose.connection.close();
  }
}

importData();