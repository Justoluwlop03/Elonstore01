import crypto from "crypto";
import mongoose from "mongoose";
import { config } from "../config.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

const PAYSTACK_API = "https://api.paystack.co";

async function paystackRequest(path, options = {}) {
  const response = await fetch(`${PAYSTACK_API}${path}`, { ...options, headers: { Authorization: `Bearer ${config.paystackSecretKey}`, "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.status) throw Object.assign(new Error(body?.message || "Unable to contact Paystack."), { status: 502 });
  return body.data;
}

export function createPaymentReference() { return `fj_${crypto.randomUUID().replaceAll("-", "")}`; }

export async function initializePaystackPayment({ email, amount, reference }) {
  return paystackRequest("/transaction/initialize", { method: "POST", body: JSON.stringify({ email, amount, reference, currency: "NGN", callback_url: `${config.frontendUrl.replace(/\/$/, "")}/payment/verify?reference=${encodeURIComponent(reference)}` }) });
}

export async function verifyAndFinalizePaystackPayment(reference) {
  const payment = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
  const order = await Order.findOne({ "payment.reference": reference });
  if (!order) throw Object.assign(new Error("Payment order was not found."), { status: 404 });
  if (order.payment.status === "success") return order;
  if (payment.reference !== reference || payment.amount !== order.payment.amount || payment.currency !== "NGN" || payment.status !== "success") {
    const reason = payment.gateway_response || payment.status || "Payment was not successful.";
    await Order.updateOne({ _id: order._id, "payment.status": "pending" }, { $set: { status: "Payment failed", "payment.status": "failed", "payment.failureReason": reason } });
    throw Object.assign(new Error("Payment was not completed. Please try again."), { status: 402 });
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Order.findById(order._id).session(session);
      if (current.payment.status === "success") return;
      for (const item of current.items) {
        const product = await Product.findOneAndUpdate({ _id: item.product, active: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true, session });
        if (!product) throw Object.assign(new Error(`Insufficient stock for ${item.name}.`), { status: 409 });
      }
      current.status = "Processing";
      current.payment.status = "success";
      current.payment.paidAt = new Date(payment.paid_at || Date.now());
      await current.save({ session });
    });
  } catch (error) {
    if (error.status === 409) await Order.updateOne({ _id: order._id, "payment.status": "pending" }, { $set: { status: "Payment issue", "payment.status": "requires_refund", "payment.failureReason": "Payment confirmed, but stock was unavailable. Refund required." } });
    throw error;
  } finally { await session.endSession(); }
  return Order.findById(order._id);
}

export function isValidPaystackSignature(payload, signature) {
  const expected = crypto.createHmac("sha512", config.paystackSecretKey).update(payload).digest("hex");
  return typeof signature === "string" && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
