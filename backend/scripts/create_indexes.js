#!/usr/bin/env node
// Create necessary MongoDB indexes for search performance
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Vendor = require('../models/VendorNew');

async function run() {
  await connectDB();

  try {
    // Ensure indexes defined in schema are created
    await Vendor.init();

    // Additional explicit indexes (idempotent)
    await Vendor.collection.createIndex({ location: '2dsphere' }, { background: true });
    await Vendor.collection.createIndex({ name: 'text', businessName: 'text', contactPerson: 'text', description: 'text', searchKeywords: 'text' }, { name: 'vendor_search_text_index', background: true });
    await Vendor.collection.createIndex({ serviceType: 1, city: 1, rating: -1 }, { background: true });
    await Vendor.collection.createIndex({ isActive: 1, verified: 1 }, { background: true });

  } catch (err) {
    console.error('Failed to create indexes:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
