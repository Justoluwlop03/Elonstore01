import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { aggregateQuantities, validateOrderItems, validateShipping } from "../services/order-validation.js";
import { createPaymentReference, initializePaystackPayment, verifyAndFinalizePaystackPayment } from "../services/paystack.js";
import { sendOrderConfirmationIfNeeded } from "../services/email.js";

export const ordersRouter = express.Router();

function makeOrderNumber() {
  return `FJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

ordersRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { items, shipping } = req.body;
    const itemError = validateOrderItems(items);
    if (itemError) return res.status(400).json({ message: itemError });
    if (!validateShipping(shipping)) return res.status(400).json({ message: "Complete all delivery details with a valid email address." });

    const quantities = aggregateQuantities(items);
    const products = await Product.find({ slug: { $in: [...quantities.keys()] }, active: true });
    if (products.length !== quantities.size) return res.status(400).json({ message: "One or more products are no longer available." });
    const orderItems = [];
    let total = 0;
    for (const product of products) {
      const quantity = quantities.get(product.slug);
      if (product.stock < quantity) return res.status(409).json({ message: `${product.name} does not have enough stock.` });
      total += product.price * quantity;
      orderItems.push({ product: product._id, name: product.name, slug: product.slug, price: product.price, quantity, image: product.images[0]?.url || "" });
    }
    const reference = createPaymentReference();
    const order = await Order.create({ orderNumber: makeOrderNumber(), user: req.user._id, items: orderItems, shipping, total, payment: { reference, amount: Math.round(total * 100) } });
    try {
      const payment = await initializePaystackPayment({ email: shipping.email, amount: order.payment.amount, reference });
      res.status(201).json({ order, authorizationUrl: payment.authorization_url, reference });
    } catch (error) {
      await Order.updateOne({ _id: order._id }, { $set: { status: "Payment failed", "payment.status": "failed", "payment.failureReason": "Could not initialize Paystack payment." } });
      throw error;
    }
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
});

ordersRouter.post("/payment/verify", requireAuth, async (req, res, next) => {
  try {
    const { reference } = req.body;
    if (typeof reference !== "string" || !reference) return res.status(400).json({ message: "A payment reference is required." });
    const order = await Order.findOne({ "payment.reference": reference, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Payment order was not found." });
    const completedOrder = await verifyAndFinalizePaystackPayment(reference);
    try { await sendOrderConfirmationIfNeeded(completedOrder); } catch (error) { console.error("Order confirmation email failed:", error.message); }
    res.json({ order: completedOrder });
  } catch (error) { next(error); }
});

ordersRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (error) { next(error); }
});

ordersRouter.get("/", requireAuth, requireAdmin, async (_, res, next) => {
  try {
    const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 }).limit(200).lean();
    res.json({ orders });
  } catch (error) { next(error); }
});

ordersRouter.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["Processing", "Shipped", "Delivered", "Cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
    const order = await Order.findOneAndUpdate({ _id: req.params.id, "payment.status": "success" }, { status: req.body.status }, { new: true }).populate("user", "name email");
    if (!order) return res.status(409).json({ message: "Only paid orders can be fulfilled." });
    res.json({ order });
  } catch (error) { next(error); }
});
