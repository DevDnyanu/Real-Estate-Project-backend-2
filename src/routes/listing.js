// server/src/routes/listing.js
import express from 'express';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  uploadImages,
  deleteImages,
  getImage
} from '../controllers/listingController.js';
import authenticateToken from '../Middlewares/auth.js'; 

const router = express.Router();

let storage;

try {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
        const fileInfo = {
          filename: filename,
          bucketName: "images",
          metadata: {
            listingId: req.params.listingId
          }
        };
        resolve(fileInfo);
      });
    }
  });
} catch (error) {
  console.error('Error creating GridFS storage:', error.message);
  storage = multer.memoryStorage();
}

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6, // Max 6 files
  },
});


router.use(authenticateToken);

// CRUD routes
router.post("/", createListing);
router.get("/", getListings);
router.get("/:id", getListing);
router.put("/:id", updateListing);
router.delete("/:id", deleteListing);

// Image handling routes
router.post("/:listingId/upload-images", upload.array("images", 6), uploadImages);
router.delete("/:listingId/images", deleteImages);
router.get("/image/:id", getImage);

export { router as listingRoutes };