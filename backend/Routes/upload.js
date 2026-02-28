const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed!"), false);
    }
  },
});

// Helper function to upload buffer to Cloudinary using base64 upload (avoids streaming timeouts)
const uploadToCloudinary = async (
  buffer,
  folder,
  resourceType = "auto",
  attempt = 1,
) => {
  try {
    const mime =
      buffer.type || (resourceType === "video" ? "video/mp4" : "image/jpeg");
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      resource_type: resourceType,
      timeout: 60000,
      transformation:
        resourceType === "image"
          ? [
              { width: 1920, crop: "limit" },
              { quality: "auto:good" },
              { fetch_format: "auto" },
            ]
          : undefined,
    });
    return result;
  } catch (error) {
    console.error(`Cloudinary upload attempt ${attempt} failed:`, error);
    if (attempt < 2) {
      // simple retry after short delay
      await new Promise((res) => setTimeout(res, 2000));
      return uploadToCloudinary(buffer, folder, resourceType, attempt + 1);
    }
    throw error;
  }
};

// POST /upload/single - Upload single media file
router.post("/single", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.body.userId || "anonymous";
    // Use the type to determine the custom folder, falling back to 'misc'
    const type = req.body.type || "misc";
    const folder = `${type}/${userId}`;
    const resourceType = req.file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    const result = await uploadToCloudinary(
      req.file.buffer,
      folder,
      resourceType,
    );

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error("Single upload error:", error);
    res.status(500).json({
      error: "Failed to upload file",
      message: error.message,
    });
  }
});

// POST /upload/media - Upload multiple media files
router.post("/media", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const uploadPromises = req.files.map(async (file) => {
      const folder = `posts/${userId}`;
      const resourceType = file.mimetype.startsWith("video/")
        ? "video"
        : "image";

      try {
        const result = await uploadToCloudinary(
          file.buffer,
          folder,
          resourceType,
        );
        return {
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        };
      } catch (error) {
        console.error(`Failed to upload ${file.originalname}:`, error);
        throw new Error(`Failed to upload ${file.originalname}`);
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Failed to upload files",
      message: error.message,
    });
  }
});

// DELETE /upload/media - Delete a media file from Cloudinary
router.delete("/media", async (req, res) => {
  try {
    const { publicId, resourceType } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
    });

    res.json({
      success: true,
      result: result,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      error: "Failed to delete file",
      message: error.message,
    });
  }
});

module.exports = router;
