import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ message: "Authentication required." });
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ message: "Account no longer exists." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required." });
  next();
}
