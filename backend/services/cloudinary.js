import { v2 as cloudinary } from "cloudinary";
import { config } from "../config.js";

cloudinary.config({ cloud_name: config.cloudinary.cloudName, api_key: config.cloudinary.apiKey, api_secret: config.cloudinary.apiSecret, secure: true });

export function uploadProductImage(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "nova/products", resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"], transformation: [{ width: 1600, height: 1600, crop: "limit" }, { quality: "auto", fetch_format: "auto" }] },
      (error, result) => error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id }),
    );
    stream.end(file.buffer);
  });
}

export function deleteProductImage(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
