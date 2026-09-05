import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

export const categoriesRouter = express.Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try { res.json({ categories: await Category.find().sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});

categoriesRouter.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2 || name.length > 60) return res.status(400).json({ message: "Category names must be between 2 and 60 characters." });
    const category = await Category.create({ name });
    res.status(201).json({ category });
  } catch (error) { next(error); }
});

categoriesRouter.patch("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2 || name.length > 60) return res.status(400).json({ message: "Category names must be between 2 and 60 characters." });
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    const oldName = category.name;
    category.name = name;
    await category.save();
    await Product.updateMany({ category: oldName }, { $set: { category: name } });
    res.json({ category });
  } catch (error) { next(error); }
});

categoriesRouter.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    if (await Product.exists({ category: category.name, active: true })) return res.status(409).json({ message: "Move or delete products in this category before deleting it." });
    await category.deleteOne();
    res.status(204).end();
  } catch (error) { next(error); }
});
