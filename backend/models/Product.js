import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({ url: { type: String, required: true }, publicId: { type: String, required: true } }, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 60, index: true },
    description: { type: String, default: "", maxlength: 4000 },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    color: { type: String, default: "", maxlength: 60 },
    images: { type: [imageSchema], validate: [(images) => images.length > 0, "At least one image is required"] },
    stock: { type: Number, required: true, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
