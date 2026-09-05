import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "JWT_SECRET", "PAYSTACK_SECRET_KEY", "BREVO_API_KEY", "BREVO_SENDER_EMAIL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  adminInviteCode: process.env.ADMIN_INVITE_CODE || "",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  frontendUrl: process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0].trim(),
  backendUrl: (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, ""),
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL,
    senderName: process.env.BREVO_SENDER_NAME || "Elon Store",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};
