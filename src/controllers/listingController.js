// controllers/listingController.js
import Listing from "../models/Listing.js";
import mongoose from "mongoose";

// Function to get GridFS buckets
const getImageBucket = () => {
  const db = mongoose.connection.db;
  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: "images"
  });
};

const getVideoBucket = () => {
  const db = mongoose.connection.db;
  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: "videos"
  });
};

/** Create listing (TEXT DATA ONLY) */
export const createListing = async (req, res, next) => {
  try {
    // Add the user ID from the authenticated user
    const listingData = {
      ...req.body,
      userRef: req.user.userId
    };
    
    const listing = await Listing.create(listingData);
    return res.status(201).json({
      success: true,
      message: "Listing created successfully",
      listingId: listing._id,
      listing,
    });
  } catch (err) {
    next(err);
  }
};

/** Get all listings */
export const getListings = async (req, res, next) => {
  try {
    let query = {};
    
    // ✅ CRITICAL FIX: Check header first, then token role
    const headerRole = req.headers['x-current-role'];
    const tokenRole = req.user?.role;
    
    console.log("🔍 GetListings - Header Role:", headerRole, "Token Role:", tokenRole, "User ID:", req.user?.userId);
    
    // ✅ USE HEADER ROLE ONLY - This is the current selected role
    const currentRole = headerRole || 'buyer'; // Default to buyer if no header
    
    console.log("🎯 Current role for filtering:", currentRole);
    
    // ✅ FIX: Only filter if current role is seller AND user is authenticated
    if (currentRole === 'seller' && req.user && req.user.userId) {
      query = { userRef: req.user.userId };
      console.log("👨‍💼 Showing seller's listings only - User ID:", req.user.userId);
    } else {
      console.log("👨‍💻 Showing ALL listings - Role:", currentRole, "Authenticated:", !!req.user);
      // ✅ NO FILTER for buyers - show all listings
      query = {}; // Explicitly show all listings
    }
    
    const listings = await Listing.find(query).sort({ createdAt: -1 });
    console.log("📊 Total listings found:", listings.length);

    // Add image and video URLs with safe handling
    const listingsWithMedia = listings.map(listing => {
      const listingObj = listing.toObject();
      
      const images = Array.isArray(listingObj.images) ? listingObj.images : [];
      const videos = Array.isArray(listingObj.videos) ? listingObj.videos : [];
      
      const imageUrls = images.map(imgId => {
        if (typeof imgId === 'string' && imgId.startsWith('http')) {
          return imgId;
        }
        return `${req.protocol}://${req.get("host")}/api/listings/image/${imgId}`;
      });
      
      const videoUrls = videos.map(vidId => {
        if (typeof vidId === 'string' && vidId.startsWith('http')) {
          return vidId;
        }
        return `${req.protocol}://${req.get("host")}/api/listings/video/${vidId}`;
      });
      
      return {
        ...listingObj,
        images: imageUrls,
        videos: videoUrls
      };
    });

    return res.json({
      success: true,
      message: "Listings retrieved successfully",
      listings: listingsWithMedia,
      userRole: currentRole,
      filteredFor: (currentRole === 'seller' && req.user?.userId) ? 'seller' : 'all',
      totalCount: listingsWithMedia.length
    });
  } catch (err) {
    next(err);
  }
};



/** Get single listing */
export const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Add image and video URLs with safe handling
    const listingObj = listing.toObject();
    const images = Array.isArray(listingObj.images) ? listingObj.images : [];
    const videos = Array.isArray(listingObj.videos) ? listingObj.videos : [];
    
    // Generate proper image URLs
    const imageUrls = images.map(imgId => {
      if (typeof imgId === 'string' && imgId.startsWith('http')) {
        return imgId;
      }
      return `${req.protocol}://${req.get("host")}/api/listings/image/${imgId}`;
    });
    
    // Generate proper video URLs
    const videoUrls = videos.map(vidId => {
      if (typeof vidId === 'string' && vidId.startsWith('http')) {
        return vidId;
      }
      return `${req.protocol}://${req.get("host")}/api/listings/video/${vidId}`;
    });
    
    const listingWithMedia = {
      ...listingObj,
      images: imageUrls,
      videos: videoUrls
    };

    return res.json({
      success: true,
      message: "Listing retrieved successfully",
      listing: listingWithMedia,
    });
  } catch (err) {
    next(err);
  }
};

/** Upload images to MongoDB GridFS */
export const uploadImagesHandler = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "listingId is required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Check if listing exists
    const listingExists = await Listing.exists({ _id: listingId });
    if (!listingExists) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const bucket = getImageBucket();
    const uploadResults = [];

    // Process all files in parallel
    const uploadPromises = req.files.map((file, index) => 
      new Promise((resolve) => {
        const filename = `img-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            listingId: listingId,
            originalName: file.originalname,
            contentType: file.mimetype,
            uploadedBy: req.user ? req.user.userId : 'unknown',
            uploadDate: new Date()
          }
        });

        uploadStream.end(file.buffer);

        uploadStream.on('finish', () => {
          uploadResults.push({ success: true, fileId: uploadStream.id });
          resolve();
        });

        uploadStream.on('error', (error) => {
          uploadResults.push({ success: false, error: error.message });
          resolve();
        });
      })
    );

    await Promise.all(uploadPromises);

    // Get successful file IDs
    const successfulFileIds = uploadResults
      .filter(result => result.success)
      .map(result => result.fileId);

    if (successfulFileIds.length === 0) {
      return res.status(500).json({
        success: false,
        message: "All image uploads failed",
      });
    }

    // Update listing with new image references
    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      { 
        $push: { 
          images: { 
            $each: successfulFileIds 
          } 
        } 
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: `${successfulFileIds.length} image(s) uploaded successfully`,
      fileIds: successfulFileIds,
      failed: req.files.length - successfulFileIds.length,
      listing: updatedListing,
    });
  } catch (err) {
    next(err);
  }
};

/** Upload videos to MongoDB GridFS */
export const uploadVideosHandler = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "listingId is required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Check if listing exists
    const listingExists = await Listing.exists({ _id: listingId });
    if (!listingExists) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const bucket = getVideoBucket();
    const uploadResults = [];

    // Process all files in parallel
    const uploadPromises = req.files.map((file, index) => 
      new Promise((resolve) => {
        const filename = `vid-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            listingId: listingId,
            originalName: file.originalname,
            contentType: file.mimetype,
            uploadedBy: req.user ? req.user.userId : 'unknown',
            uploadDate: new Date()
          }
        });

        uploadStream.end(file.buffer);

        uploadStream.on('finish', () => {
          uploadResults.push({ success: true, fileId: uploadStream.id });
          resolve();
        });

        uploadStream.on('error', (error) => {
          uploadResults.push({ success: false, error: error.message });
          resolve();
        });
      })
    );

    await Promise.all(uploadPromises);

    // Get successful file IDs
    const successfulFileIds = uploadResults
      .filter(result => result.success)
      .map(result => result.fileId);

    if (successfulFileIds.length === 0) {
      return res.status(500).json({
        success: false,
        message: "All video uploads failed",
      });
    }

    // Update listing with new video references
    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      { 
        $push: { 
          videos: { 
            $each: successfulFileIds 
          } 
        } 
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: `${successfulFileIds.length} video(s) uploaded successfully`,
      fileIds: successfulFileIds,
      failed: req.files.length - successfulFileIds.length,
      listing: updatedListing,
    });
  } catch (err) {
    next(err);
  }
};

/** Delete images from MongoDB GridFS */
export const deleteImages = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Image IDs array is required",
      });
    }

    // Delete files from GridFS
    const bucket = getImageBucket();
    for (const imageId of imageIds) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(imageId));
      } catch (deleteError) {
        console.error(`Error deleting image ${imageId}:`, deleteError);
      }
    }

    // Remove image references from listing
    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      { $pull: { images: { $in: imageIds } } },
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.json({
      success: true,
      message: "Images deleted successfully",
      listing: updatedListing,
    });
  } catch (err) {
    next(err);
  }
};

/** Delete videos from MongoDB GridFS */
export const deleteVideos = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Video IDs array is required",
      });
    }

    // Delete files from GridFS
    const bucket = getVideoBucket();
    for (const videoId of videoIds) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(videoId));
      } catch (deleteError) {
        console.error(`Error deleting video ${videoId}:`, deleteError);
      }
    }

    // Remove video references from listing
    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      { $pull: { videos: { $in: videoIds } } },
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.json({
      success: true,
      message: "Videos deleted successfully",
      listing: updatedListing,
    });
  } catch (err) {
    next(err);
  }
};

/** Get image from MongoDB GridFS */
export const getImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'null' || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "Invalid image ID" 
      });
    }
    
    const bucket = getImageBucket();
    
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }
    
    res.set('Content-Type', files[0].contentType || 'image/jpeg');
    
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(id));
    
    downloadStream.on("data", (chunk) => {
      res.write(chunk);
    });
    
    downloadStream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Image not found" });
      }
    });
    
    downloadStream.on("end", () => {
      res.end();
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching image" });
  }
};

/** Get video from MongoDB GridFS */
export const getVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'null' || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "Invalid video ID" 
      });
    }
    
    const bucket = getVideoBucket();
    
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    res.set('Content-Type', files[0].contentType || 'video/mp4');
    
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(id));
    
    downloadStream.on("data", (chunk) => {
      res.write(chunk);
    });
    
    downloadStream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Video not found" });
      }
    });
    
    downloadStream.on("end", () => {
      res.end();
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching video" });
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.json({
      success: true,
      message: "Listing updated successfully",
      listing: updatedListing,
    });
  } catch (err) {
    next(err);
  }
};

/** Delete listing */
export const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};