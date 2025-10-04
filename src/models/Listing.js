// models/Listing.js
import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 62,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z\s]+$/.test(v);
        },
        message: 'Name can only contain letters and spaces'
      }
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000
    },
    address: {
      type: String,
      required: true,
      minlength: 15
    },
    type: {
      type: String,
      required: true,
      enum: ['sale', 'rent']
    },
    // Plot specific fields (REQUIRED)
    plotType: {
      type: String,
      required: true,
      enum: ['agriculture', 'non-agriculture', 'mountain']
    },
    plotSubType: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          const subTypeValidations = {
            agriculture: ['land', 'vegetable', 'fruit', 'sugarcane', 'banana', 'grapes'],
            'non-agriculture': ['na', 'gunta'],
            mountain: ['top', 'bottom', 'tilt']
          };
          return subTypeValidations[this.plotType]?.includes(v) || false;
        },
        message: 'Invalid plot sub-type for the selected plot type'
      }
    },
    plotSize: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1000
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 1000,
      max: 1000000
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 100000,
      max: 50000000
    },
    userRef: {
      type: String,
      required: true
    },
    images: [{
      type: String // Store image URLs instead of ObjectId
    }],
    videos: [{
      type: String // Store video URLs instead of ObjectId
    }]
  },
  { timestamps: true }
);

// Pre-save middleware to calculate totalPrice
listingSchema.pre('save', function(next) {
  
  if (this.isModified('plotSize') || this.isModified('pricePerUnit') || !this.totalPrice) {
    this.totalPrice = this.plotSize * this.pricePerUnit;
  }
  next();
});

export default mongoose.model('Listing', listingSchema);