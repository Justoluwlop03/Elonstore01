import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { deleteProductImage, uploadProductImage } from "../services/cloudinary.js";
import { sendProductUploadConfirmationEmail } from "../services/email.js";

export const productsRouter = express.Router();

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

productsRouter.get("/", async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.category) filter.category = String(req.query.category);
    const products = await Product.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ products });
  } catch (error) { next(error); }
});

productsRouter.get("/:slug", async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (error) { next(error); }
});

productsRouter.post("/", requireAuth, requireAdmin, upload.array("images", 5), async (req, res, next) => {
  try {
    const { name, category, description = "", price, oldPrice, color = "", stock = 0 } = req.body;
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    const numericOldPrice = oldPrice === undefined || oldPrice === "" ? undefined : Number(oldPrice);
    if (typeof name !== "string" || typeof category !== "string" || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericStock) || numericStock < 0 || (numericOldPrice !== undefined && (!Number.isFinite(numericOldPrice) || numericOldPrice < 0))) return res.status(400).json({ message: "Name, category, price, and a non-negative whole-number stock are required." });
    if (!req.files?.length) return res.status(400).json({ message: "Upload at least one product image." });
    if (!await Category.exists({ name: category.trim() })) return res.status(400).json({ message: "Select a category created by an administrator." });
    const baseSlug = slugify(name);
    if (!baseSlug) return res.status(400).json({ message: "Product name is invalid." });
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const images = await Promise.all(req.files.map(uploadProductImage));
    const product = await Product.create({ name, slug, category, description, price: numericPrice, oldPrice: numericOldPrice, color, stock: numericStock, images });
    try { await sendProductUploadConfirmationEmail({ user: req.user, product }); } catch (error) { console.error("Product upload confirmation email failed:", error.message); }
    res.status(201).json({ product });
  } catch (error) { next(error); }
});

productsRouter.patch("/:slug", requireAuth, requireAdmin, upload.array("images", 5), async (req, res, next) => {
  try {
    const { name, category, description, price, oldPrice, color, stock } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (price !== undefined) updates.price = Number(price);
    if (oldPrice !== undefined && oldPrice !== "") updates.oldPrice = Number(oldPrice);
    if (stock !== undefined) updates.stock = Number(stock);
    if ((updates.price !== undefined && (!Number.isFinite(updates.price) || updates.price < 0)) || (updates.stock !== undefined && (!Number.isInteger(updates.stock) || updates.stock < 0)) || (updates.oldPrice !== undefined && (!Number.isFinite(updates.oldPrice) || updates.oldPrice < 0))) return res.status(400).json({ message: "Price, old price, and stock must be non-negative numbers; stock must be whole." });
    const productBeforeUpdate = await Product.findOne({ slug: req.params.slug, active: true });
    if (!productBeforeUpdate) return res.status(404).json({ message: "Product not found." });
    if (updates.category !== undefined && updates.category !== productBeforeUpdate.category && !await Category.exists({ name: String(updates.category).trim() })) return res.status(400).json({ message: "Select a category created by an administrator." });
    if (req.files?.length) updates.images = [...productBeforeUpdate.images, ...await Promise.all(req.files.map(uploadProductImage))];
    if (req.body.imagesToRemove) {
      let imagesToRemove;
      try { imagesToRemove = JSON.parse(req.body.imagesToRemove); } catch { return res.status(400).json({ message: "imagesToRemove must be valid JSON." }); }
      if (!Array.isArray(imagesToRemove)) return res.status(400).json({ message: "imagesToRemove must be an array." });
      const removedIds = new Set(imagesToRemove);
      const remainingImages = (updates.images || productBeforeUpdate.images).filter((image) => !removedIds.has(image.publicId));
      if (!remainingImages.length) return res.status(400).json({ message: "A product must keep at least one image." });
      updates.images = remainingImages;
      await Promise.all(imagesToRemove.map(deleteProductImage));
    }
    const updateOperation = { $set: updates };
    if (oldPrice === "") updateOperation.$unset = { oldPrice: 1 };
    const product = await Product.findOneAndUpdate({ _id: productBeforeUpdate._id }, updateOperation, { new: true, runValidators: true });
    res.json({ product });
  } catch (error) { next(error); }
});

productsRouter.delete("/:slug", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate({ slug: req.params.slug, active: true }, { active: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});
