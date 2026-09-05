import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
}, { timestamps: true });

export const Category = mongoose.model("Category", categorySchema);
