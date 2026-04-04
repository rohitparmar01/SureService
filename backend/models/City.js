const mongoose = require('mongoose');

/**
 * City Model - Stores all cities/towns in India from OpenStreetMap
 * Used for vendor registration and user location search
 */
const citySchema = new mongoose.Schema({
  // OpenStreetMap ID for uniqueness
  osm_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // City name
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  
  // Normalized name for search (lowercase, no special chars)
  normalizedName: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // State name
  state: {
    type: String,
    trim: true,
    index: true
  },
  
  // Place type from OSM (city, town, village, etc.)
  placeType: {
    type: String,
    enum: ['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood'],
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
  
  // Population (if available from OSM)
  population: {
    type: Number
  },
  
  // Number of areas within this city
  areaCount: {
    type: Number,
    default: 0
  },
  
  // Whether areas have been fetched for this city
  areasFetched: {
    type: Boolean,
    default: false
  },
  
  // Additional OSM tags
  osmTags: {
    type: Map,
    of: String
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
citySchema.index({ location: '2dsphere' });

// Compound indexes for common queries
citySchema.index({ name: 1, state: 1 });
citySchema.index({ placeType: 1, population: -1 });

// Pre-save middleware to set normalized name and coordinates
citySchema.pre('save', function(next) {
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

// Static method to find cities near a location
citySchema.statics.findNearby = function(longitude, latitude, maxDistance = 50000) {
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
  });
};

// Static method to search cities by name (prioritizes cities starting with search term)
citySchema.statics.searchByName = function(searchTerm, limit = 20) {
  const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  // Use aggregation to prioritize cities starting with search term
  return this.aggregate([
    {
      $match: {
        $or: [
          { normalizedName: { $regex: normalizedSearch, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    },
    {
      $addFields: {
        // Priority: 1 if starts with search term, 2 otherwise
        searchPriority: {
          $cond: [
            { $regexMatch: { input: '$normalizedName', regex: `^${normalizedSearch}` } },
            1,
            2
          ]
        }
      }
    },
    {
      $sort: {
        searchPriority: 1,  // Cities starting with term first
        population: -1,      // Then by population
        name: 1             // Then alphabetically
      }
    },
    {
      $limit: limit
    },
    {
      $project: {
        searchPriority: 0  // Remove the helper field
      }
    }
  ]);
};

const City = mongoose.model('City', citySchema);

module.exports = City;
