const mongoose = require('mongoose');

/**
 * Area Model - Stores suburbs/neighbourhoods within cities
 * Used for precise vendor location and radius-based search
 */
const areaSchema = new mongoose.Schema({
  // OpenStreetMap ID for uniqueness
  osm_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Area name
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  
  // Normalized name for search
  normalizedName: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Reference to parent city
  city_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true,
    index: true
  },
  
  // City name (denormalized for quick access)
  cityName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // City OSM ID
  cityOsmId: {
    type: String,
    required: true,
    index: true
  },
  
  // Place type from OSM
  placeType: {
    type: String,
    enum: ['suburb', 'neighbourhood', 'quarter', 'locality'],
    default: 'suburb',
    index: true
  },
  
  // Geospatial location (GeoJSON Point)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates [longitude, latitude]'
      }
    }
  },
  
  // Individual coordinates for easy access
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  
  lon: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  
  // Additional OSM tags
  osmTags: {
    type: Map,
    of: String
  },
  
  // Whether this area has vendors
  hasVendors: {
    type: Boolean,
    default: false
  },
  
  // Vendor count
  vendorCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
areaSchema.index({ location: '2dsphere' });

// Compound indexes for common queries (cityOsmId already indexed inline)
areaSchema.index({ cityName: 1, name: 1 });
areaSchema.index({ city_id: 1, placeType: 1 });

// Pre-save middleware to set normalized name and coordinates
areaSchema.pre('save', function(next) {
  if (this.name) {
    this.normalizedName = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }
  
  // Ensure location.coordinates match lat/lon
  if (this.lat && this.lon) {
    this.location = {
      type: 'Point',
      coordinates: [this.lon, this.lat]
    };
  }
  
  next();
});

// Static method to find areas near a location
areaSchema.statics.findNearby = function(longitude, latitude, maxDistance = 25000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  }).populate('city_id');
};

// Static method to search areas by name within a city
areaSchema.statics.searchByCityAndName = function(cityId, searchTerm, limit = 20) {
  const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  return this.find({
    city_id: cityId,
    $or: [
      { normalizedName: { $regex: normalizedSearch, $options: 'i' } },
      { name: { $regex: searchTerm, $options: 'i' } }
    ]
  })
  .sort({ name: 1 })
  .limit(limit);
};

// Static method to get all areas for a city
areaSchema.statics.getByCityOsmId = function(cityOsmId) {
  return this.find({ cityOsmId })
    .sort({ name: 1 })
    .select('name osm_id lat lon placeType');
};

/**
 * AUTO-CREATE OR UPDATE AREA FROM VENDOR REGISTRATION
 * This method is called when a vendor registers with a new area
 * @param {Object} areaData - { cityId, cityName, cityOsmId, area, lat, lon }
 * @returns {Promise<Area>} - The created or updated area document
 */
areaSchema.statics.createOrUpdateFromVendor = async function(areaData) {
  const { cityId, cityName, cityOsmId, area, lat, lon } = areaData;
  
  if (!area || !cityId || !lat || !lon) {
    throw new Error('Missing required area data for auto-creation');
  }
  
  // Create unique ID for this area
  const areaOsmId = `vendor/${cityName}/${area}`.toLowerCase().replace(/\s+/g, '-');
  
  // Check if area already exists
  const existing = await this.findOne({ osm_id: areaOsmId });
  
  if (existing) {
    // Update vendor count
    existing.hasVendors = true;
    existing.vendorCount = (existing.vendorCount || 0) + 1;
    existing.updatedAt = new Date();
    await existing.save();
    return existing;
  }
  
  // Create new area
  const newArea = await this.create({
    osm_id: areaOsmId,
    name: area,
    normalizedName: area.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
    city_id: cityId,
    cityName: cityName,
    cityOsmId: cityOsmId || `vendor-city/${cityName}`.toLowerCase(),
    placeType: 'locality',
    location: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    lat: lat,
    lon: lon,
    osmTags: {
      source: 'vendor_registration',
      auto_created: 'true'
    },
    hasVendors: true,
    vendorCount: 1
  });
  
  return newArea;
};

const Area = mongoose.model('Area', areaSchema);

module.exports = Area;
