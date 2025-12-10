require('dotenv').config();
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Medicine = require('./models/Medicine');
const Pharmacy = require('./models/Pharmacy');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function seedDatabase() {
  try {
    await connectDB();
    console.log('\n🌱 Starting database seed...\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Medicine.deleteMany({});
    await Pharmacy.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({}); // Clear users to start fresh or just findOne
    console.log('✓ Data cleared\n');

    // Create Pharmacy Owner
    const owner = await User.create({
      username: 'PharmOwner',
      email: 'owner@pharmacy.com',
      password: 'password123', // In real app, hash this
      role: 'pharmacy',
      phone: '1234567890'
    });
    console.log(`✓ Pharmacy Owner created: ${owner._id}\n`);

    const samplePharmacies = [
      {
        name: 'Central Pharmacy',
        address: '123 Main Street, Downtown',
        city: 'New York',
        phone: '555-0101',
        owner_id: owner._id,
        is_active: true
      },
      {
        name: 'Quick Care Pharmacy',
        address: '456 Oak Avenue, Midtown',
        city: 'Chicago',
        phone: '555-0102',
        owner_id: owner._id,
        is_active: true
      },
      {
        name: 'Premium Health Pharmacy',
        address: '789 Elm Road, Uptown',
        city: 'Los Angeles',
        phone: '555-0103',
        owner_id: owner._id,
        is_active: true
      }
    ];

    // Seed Pharmacies
    console.log('📦 Seeding pharmacies...');
    const pharmacies = await Pharmacy.insertMany(samplePharmacies);
    console.log(`✓ ${pharmacies.length} pharmacies seeded\n`);

    // Parse CSV and Seed Products/Medicines
    console.log('💊 Reading Medicines.csv...');
    const results = [];
    const csvPath = path.join(__dirname, 'data', 'Medicines.csv');

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`✓ Parsed ${results.length} records from CSV\n`);

        const productsToInsert = results.map(row => {
          // Helper to safe parse numbers
          const parseNum = (val) => {
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
          };

          const price = Math.floor(Math.random() * 50) + 10; // Random price

          return {
            name: row['Medicine Name'],
            composition: row['Composition'] || '',
            uses: row['Uses'] || '',
            side_effects: row['Side_effects'] || '',
            image_url: row['Image URL'] || '',
            manufacturer: row['Manufacturer'] || '',
            stock: parseNum(row['Stock']),
            reviews: {
              excellent: parseNum(row['Excellent Review %']),
              average: parseNum(row['Average Review %']),
              poor: parseNum(row['Poor Review %'])
            },
            // Default fields not in CSV
            description: row['Uses'] || '', // Fallback description
            price: price,
            unit_price: price, // Consistent price field
            category: 'General',
            pharmacyId: pharmacies[0]._id,
            pharmacy_id: pharmacies[0]._id
          };
        });

        console.log('🛍️ Seeding products from CSV...');
        // Insert in chunks to avoid memory issues if large, but 10k is manageable usually.
        // For safety, let's just insert all.
        await Product.insertMany(productsToInsert);
        console.log(`✓ ${productsToInsert.length} products seeded\n`);

        console.log('✅ Database seeded successfully!\n');
        process.exit(0);
      });

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();