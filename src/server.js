import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRoutes from "./routes/auth.js";
import { listingRoutes } from "./routes/listing.js";
import paymentRoutes from "./routes/payment.js";
import packageRoutes from './routes/package.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ENHANCED CORS for production
app.use(cors({
  origin: [
    "https://plotchamps.in",
    "https://www.plotchamps.in", 
    "http://localhost:3000",
    "http://localhost:8080"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "x-current-role",
    "X-Current-Role",
    "x-user-role", 
    "X-Requested-With"
  ]
}));

app.options('*', cors()); // Pre-flight requests

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => res.send("Backend server is running"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/packages', packageRoutes);

// ✅ CLIENT-SIDE ROUTING - CRITICAL FIX FOR 404 ERROR
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false, 
      message: 'API endpoint not found' 
    });
  }
  
  // Serve React app for all other routes (like /listings, /properties, etc.)
  try {
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    } else {
      // If no build directory exists
      return res.status(200).json({
        message: "React App - Client Side Routing Enabled",
        path: req.path,
        note: "Build the React app for proper client-side routing"
      });
    }
  } catch (error) {
    console.error("Error serving React app:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server configuration error" 
    });
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });