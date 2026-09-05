import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { categoriesRouter } from "./routes/categories.js";
import { isValidPaystackSignature, verifyAndFinalizePaystackPayment } from "./services/paystack.js";
import { sendOrderConfirmationIfNeeded } from "./services/email.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.corsOrigin.split(",").map((origin) => origin.trim()), credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"] }));
app.post("/api/payments/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!isValidPaystackSignature(req.body, req.get("x-paystack-signature"))) return res.status(401).json({ message: "Invalid Paystack signature." });
  const event = JSON.parse(req.body.toString("utf8"));
  const reference = event?.data?.reference;
  if (typeof reference !== "string") return res.sendStatus(200);
  try {
    const order = await verifyAndFinalizePaystackPayment(reference);
    try { await sendOrderConfirmationIfNeeded(order); } catch (emailError) { console.error("Order confirmation email failed:", emailError.message); }
  } catch (error) {
    if (error.status === 402) return res.sendStatus(200);
    console.error("Paystack webhook failed:", error.message);
    return res.sendStatus(500);
  }
  res.sendStatus(200);
});
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many attempts. Please try again later." } });
app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/auth", authLimit, authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders", ordersRouter);

app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` }));
app.use((error, req, res, next) => {
  void next;
  if (error.name === "MulterError") return res.status(400).json({ message: error.message });
  if (error.message === "Only JPEG, PNG, WebP, and AVIF images are allowed.") return res.status(400).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: "A record with that value already exists." });
  if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ message: error.message });
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) return res.status(error.status).json({ message: error.message });
  console.error(error);
  res.status(500).json({ message: "Unexpected server error." });
});

export { app };

export async function start() {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => console.log(`NOVA API listening on port ${config.port}`));
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) start().catch((error) => { console.error("Failed to start API:", error.message); process.exit(1); });
