import express from "express";
import multer from "multer";
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  uploadImagesHandler,
  uploadVideosHandler,
  deleteImages,
  deleteVideos,
  getImage,
  getVideo,
  getMyListings, // ✅ NEW IMPORT
} from "../controllers/listingController.js";
import { verifyToken as authMiddleware } from "../Middlewares/auth.js";

const router = express.Router();

// Multer configuration (same as before)
const uploadImages = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
});

const uploadVideos = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"), false);
  },
  limits: { fileSize: 50 * 1024 * 1024, files: 3 },
});

// ✅ Use authMiddleware for all routes
router.use(authMiddleware);

// ✅ NEW: Seller's own listings route
router.get("/my-listings", getMyListings);

// CRUD routes
router.post("/", createListing);
router.get("/", getListings);
router.get("/:id", getListing);
router.put("/:id", updateListing);
router.delete("/:id", deleteListing);

// Image handling routes
router.post("/:listingId/upload-images", uploadImages.array("images", 6), uploadImagesHandler);
router.delete("/:listingId/images", deleteImages);

// Video handling routes
router.post("/:listingId/upload-videos", uploadVideos.array("videos", 3), uploadVideosHandler);
router.delete("/:listingId/videos", deleteVideos);

// Media serving routes
router.get("/image/:id", getImage);
router.get("/video/:id", getVideo);

export { router as listingRoutes };