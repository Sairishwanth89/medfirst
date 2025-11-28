require('dotenv').config();
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Medicine = require('./models/Medicine');
const Pharmacy = require('./models/Pharmacy');
const User = require('./models/User');

const sampleMedicines = [
  {
    name: 'Paracetamol 500mg',
    description: 'Pain reliever and fever reducer',
    category: 'Pain Relief',
    price: 5.99,
    stock: 150,
    manufacturer: 'PharmaCare',
    dosage: '500mg',
    instructions: 'Take 1-2 tablets every 4-6 hours'
  },
  {
    name: 'Ibuprofen 200mg',
    description: 'Anti-inflammatory pain reliever',
    category: 'Anti-inflammatory',
    price: 6.99,
    stock: 200,
    manufacturer: 'MediCorp',
    dosage: '200mg',
    instructions: 'Take 1 tablet every 6-8 hours'
  },
  {
    name: 'Aspirin 100mg',
    description: 'Blood thinner and pain reliever',
    category: 'Cardiovascular',
    price: 3.49,
    stock: 300,
    manufacturer: 'HealthPlus',
    dosage: '100mg',
    instructions: 'Take 1 tablet daily'
  },
  {
    name: 'Cough Syrup 100ml',
    description: 'Effective cough suppressant',
    category: 'Cough & Cold',
    price: 4.99,
    stock: 100,
    manufacturer: 'ColdCare',
    instructions: 'Take 1 tablespoon every 6 hours'
  },
  {
    name: 'Multivitamin Tablet',
    description: 'Complete daily vitamin supplement',
    category: 'Vitamins',
    price: 7.99,
    stock: 250,
    manufacturer: 'VitaMax',
    instructions: 'Take 1 tablet daily with food'
  },
  {
    name: 'Antibiotic Amoxicillin 500mg',
    description: 'Prescription antibiotic',
    category: 'Antibiotics',
    price: 8.99,
    stock: 80,
    manufacturer: 'BioDrug',
    dosage: '500mg',
    instructions: 'Take 1 capsule every 8 hours'
  },
  {
    name: 'Vitamin C 1000mg',
    description: 'Immune system booster',
    category: 'Vitamins',
    price: 5.49,
    stock: 200,
    manufacturer: 'VitaMax',
    dosage: '1000mg',
    instructions: 'Take 1 tablet daily'
  },
  {
    name: 'Antacid Gel 200ml',
    description: 'Relief from acidity and heartburn',
    category: 'Digestive',
    price: 3.99,
    stock: 120,
    manufacturer: 'DigestCare',
    instructions: 'Take 2 tablespoons after meals'
  }
];

const samplePharmacies = [
  {
    name: 'Central Pharmacy',
    address: '123 Main Street, Downtown',
    phone: '555-0101',
    email: 'central@pharmacy.com',
    is_active: true
  },
  {
    name: 'Quick Care Pharmacy',
    address: '456 Oak Avenue, Midtown',
    phone: '555-0102',
    email: 'quickcare@pharmacy.com',
    is_active: true
  },
  {
    name: 'Premium Health Pharmacy',
    address: '789 Elm Road, Uptown',
    phone: '555-0103',
    email: 'premium@pharmacy.com',
    is_active: true
  }
];

async function seedDatabase() {
  try {
    await connectDB();
    console.log('\n🌱 Starting database seed...\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Medicine.deleteMany({});
    await Pharmacy.deleteMany({});
    await Product.deleteMany({});
    console.log('✓ Data cleared\n');

    // Seed Pharmacies
    console.log('📦 Seeding pharmacies...');
    const pharmacies = await Pharmacy.insertMany(samplePharmacies);
    console.log(`✓ ${pharmacies.length} pharmacies seeded\n`);

    // Seed Medicines
    console.log('💊 Seeding medicines...');
    const medicines = await Medicine.insertMany(sampleMedicines);
    console.log(`✓ ${medicines.length} medicines seeded\n`);

    // Seed Products
    console.log('🛍️ Seeding products...');
    const products = sampleMedicines.map(med => ({
      name: med.name,
      description: med.description,
      category: med.category,
      price: med.price,
      pharmacy_id: pharmacies[0]._id,
      stock: med.stock,
      image: 'https://via.placeholder.com/150?text=' + med.name.replace(/\s/g, '+')
    }));
    await Product.insertMany(products);
    console.log(`✓ ${products.length} products seeded\n`);

    console.log('✅ Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Pharmacies: ${pharmacies.length}`);
    console.log(`  - Medicines: ${medicines.length}`);
    console.log(`  - Products: ${products.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();