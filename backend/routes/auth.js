import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { createEmailToken, hashEmailToken, sendAccountWelcomeEmail, sendPasswordResetEmail } from "../services/email.js";

export const authRouter = express.Router();

function sessionMaxAge(value) {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const units = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * units[match[2]];
}

function setSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpire });
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "lax",
    maxAge: sessionMaxAge(config.jwtExpire),
    path: "/",
  });
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: Boolean(user.emailVerifiedAt), preferences: user.preferences, createdAt: user.createdAt };
}

function hasValidAdminInviteCode(code) {
  if (typeof code !== "string" || !config.adminInviteCode) return false;
  const supplied = Buffer.from(code);
  const expected = Buffer.from(config.adminInviteCode);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function emailPage({ title, detail, content = "", status = 200 }) {
  return { status, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Elon Store</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#e5e9e1;color:#142b46;font-family:Arial,sans-serif}.card{box-sizing:border-box;width:min(100% - 32px,510px);padding:44px;background:#f8f8f4;box-shadow:0 18px 50px #142b4620}.eyebrow{margin:0 0 30px;font-size:10px;letter-spacing:1.7px;text-transform:uppercase}.mark{display:inline-grid;place-items:center;width:38px;height:38px;margin-bottom:24px;border-radius:50%;background:#dce5ee;font-size:20px}h1{margin:0 0 14px;font:400 38px/1.05 Georgia,serif}p{color:#58645f;line-height:1.65}label{display:grid;gap:8px;margin-top:28px;font-size:11px;font-weight:bold;letter-spacing:.6px;text-transform:uppercase}input{box-sizing:border-box;width:100%;padding:14px;border:1px solid #cbd1c9;background:#fff;font:16px Arial,sans-serif}button{margin-top:18px;width:100%;border:0;padding:15px;background:#142b46;color:#fff;font-size:12px;font-weight:bold;cursor:pointer}#message{min-height:24px;margin-top:18px;font-size:14px}.error{color:#9c5147}</style></head><body><main class="card"><p class="eyebrow">Elon Store</p><span class="mark">✦</span><h1>${title}</h1><p>${detail}</p>${content}</main></body></html>` };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") return res.status(400).json({ message: "Name, email, and password are required." });
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ message: "Provide a valid email and a password of at least 8 characters." });
    if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password, emailVerifiedAt: new Date() });
    try { await sendAccountWelcomeEmail({ user }); } catch (error) { console.error("Account welcome email failed:", error.message); }
    setSession(res, user);
    return res.status(201).json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

authRouter.post("/register-admin", async (req, res, next) => {
  try {
    if (await User.exists({ role: "admin" })) return res.status(403).json({ message: "Admin accounts must be created from the admin dashboard." });
    if (!config.adminInviteCode) return res.status(503).json({ message: "Admin signup is not configured." });
    if (!hasValidAdminInviteCode(req.body.inviteCode)) return res.status(403).json({ message: "The administrator invite code is invalid." });
    const { name, email, password } = req.body;
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") return res.status(400).json({ message: "Name, email, and password are required." });
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ message: "Provide a valid email and a password of at least 8 characters." });
    if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password, role: "admin", emailVerifiedAt: new Date() });
    try { await sendAccountWelcomeEmail({ user }); } catch (error) { console.error("Account welcome email failed:", error.message); }
    setSession(res, user);
    return res.status(201).json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

authRouter.post("/admins", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") return res.status(400).json({ message: "Name, email, and password are required." });
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ message: "Provide a valid email and a password of at least 8 characters." });
    if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password, role: "admin", emailVerifiedAt: new Date() });
    try { await sendAccountWelcomeEmail({ user }); } catch (error) { console.error("Account welcome email failed:", error.message); }
    return res.status(201).json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

authRouter.get("/verify-email", async (req, res, next) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const user = token && await User.findOne({ emailVerificationTokenHash: hashEmailToken(token), emailVerificationExpiresAt: { $gt: new Date() } }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) { const page = emailPage({ title: "Link unavailable", detail: "This verification link is invalid or has expired. Request a new email and try again.", status: 400 }); return res.status(page.status).type("html").send(page.html); }
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    const page = emailPage({ title: "Email verified.", detail: "Your account is ready. You can return to Elon Store and sign in." });
    res.type("html").send(page.html);
  } catch (error) { next(error); }
});

authRouter.post("/resend-verification", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const user = email && await User.findOne({ email });
    if (user) {
      try { await sendAccountWelcomeEmail({ user }); } catch (error) { console.error("Account welcome email failed:", error.message); }
    }
    res.json({ message: "If an account exists for that address, a welcome email has been sent." });
  } catch (error) { next(error); }
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const user = email && await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (user) {
      const token = createEmailToken();
      user.passwordResetTokenHash = hashEmailToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      try { await sendPasswordResetEmail({ user, token }); } catch (error) { console.error("Password reset email failed:", error.message); }
    }
    res.json({ message: "If an account exists for that address, a reset link has been sent." });
  } catch (error) { next(error); }
});

authRouter.get("/reset-password", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) { const page = emailPage({ title: "Link unavailable", detail: "This password reset link is invalid. Request a new reset email and try again.", status: 400 }); return res.status(page.status).type("html").send(page.html); }
  const escapedToken = token.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const page = emailPage({ title: "Choose a new password.", detail: "Use at least eight characters. This reset link expires after one hour.", content: `<form id="reset-form"><label>New password <input name="password" type="password" minlength="8" required autocomplete="new-password"></label><button>Reset password</button></form><p id="message" role="status"></p><script>const form=document.querySelector('#reset-form');form.addEventListener('submit',async(event)=>{event.preventDefault();const response=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${escapedToken}',password:new FormData(form).get('password')})});const body=await response.json();const message=document.querySelector('#message');message.textContent=body.message;message.className=response.ok?'':'error';if(response.ok)form.remove();});</script>` });
  res.type("html").send(page.html);
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== "string" || typeof password !== "string" || password.length < 8) return res.status(400).json({ message: "A valid reset token and a password of at least 8 characters are required." });
    const user = await User.findOne({ passwordResetTokenHash: hashEmailToken(token), passwordResetExpiresAt: { $gt: new Date() } }).select("+password +passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.status(400).json({ message: "This password reset link is invalid or has expired." });
    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) { next(error); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ message: "Email and password are required." });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: "Invalid email or password." });
    setSession(res, user);
    return res.json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

authRouter.post("/logout", (_, res) => {
  res.clearCookie("access_token", { httpOnly: true, secure: config.env === "production", sameSite: "lax", path: "/" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

authRouter.get("/users", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(500).lean();
    res.json({ users });
  } catch (error) { next(error); }
});

authRouter.delete("/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot delete your own administrator account." });
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { name, email, preferences } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) return res.status(400).json({ message: "Name must contain at least 2 characters." });
      req.user.name = name;
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Provide a valid email address." });
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.exists({ email: normalizedEmail, _id: { $ne: req.user._id } });
      if (existingUser) return res.status(409).json({ message: "An account with this email already exists." });
      req.user.email = normalizedEmail;
    }
    if (preferences !== undefined) {
      if (typeof preferences !== "object" || Array.isArray(preferences)) return res.status(400).json({ message: "Preferences must be an object." });
      for (const key of ["newArrivalNotes", "orderUpdates"]) if (key in preferences && typeof preferences[key] !== "boolean") return res.status(400).json({ message: "Preference values must be boolean." });
      req.user.preferences = { ...req.user.preferences.toObject(), ...preferences };
    }
    await req.user.save();
    return res.json({ user: safeUser(req.user) });
  } catch (error) { next(error); }
});
