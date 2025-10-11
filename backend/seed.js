const mongoose = require('mongoose');
const Location = require('./models/Location');
const sampleData = require('./sample-data.json');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cct499-maker-space';

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing locations
    await Location.deleteMany({});
    console.log('Cleared existing locations');

    // Insert sample data
    await Location.insertMany(sampleData);
    console.log(`Inserted ${sampleData.length} sample locations`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
