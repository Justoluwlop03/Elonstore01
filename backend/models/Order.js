import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: "" },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  country: { type: String, required: true, trim: true, maxlength: 80 },
  firstName: { type: String, required: true, trim: true, maxlength: 80 },
  lastName: { type: String, required: true, trim: true, maxlength: 80 },
  address: { type: String, required: true, trim: true, maxlength: 200 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  postalCode: { type: String, required: true, trim: true, maxlength: 30 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: { type: [orderItemSchema], required: true, validate: [(items) => items.length > 0, "An order requires at least one item."] },
  shipping: { type: addressSchema, required: true },
  total: { type: Number, required: true, min: 0 },
  confirmationEmailSentAt: { type: Date },
  status: { type: String, enum: ["Pending payment", "Processing", "Shipped", "Delivered", "Cancelled", "Payment failed", "Payment issue"], default: "Pending payment", index: true },
  payment: {
    provider: { type: String, enum: ["paystack"], required: true, default: "paystack" },
    reference: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["pending", "success", "failed", "requires_refund"], default: "pending", index: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date },
    failureReason: { type: String, maxlength: 500 },
  },
}, { timestamps: true });

export const Order = mongoose.model("Order", orderSchema);
