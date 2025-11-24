const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const orderRoutes = require('./routes/orders');
const pharmacyRoutes = require('./routes/pharmacies');
const stockRoutes = require('./routes/stock');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/stock', stockRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Medicine Availability System API Running (Node/Mongo)' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});