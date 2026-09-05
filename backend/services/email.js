import crypto from "crypto";
import { config } from "../config.js";
import { Order } from "../models/Order.js";

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function createEmailToken() { return crypto.randomBytes(32).toString("base64url"); }
export function hashEmailToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }

async function sendEmail({ to, subject, htmlContent, textContent }) {
  const response = await fetch(BREVO_API, {
    method: "POST",
    headers: { "api-key": config.brevo.apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender: { email: config.brevo.senderEmail, name: config.brevo.senderName }, to: [{ email: to }], subject, htmlContent, textContent }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Brevo request failed with status ${response.status}.`);
  }
}

function actionEmail({ greeting, title, detail, actionLabel, actionUrl, expiry }) {
  const note = expiry ? `This link expires in ${expiry}. If you did not request this, you can safely ignore this email.` : "We're glad to have you with us.";
  const htmlContent = `<!doctype html><html lang="en"><body style="margin:0;background:#e5e9e1;color:#142b46;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:40px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#f8f8f4"><tr><td style="padding:28px 36px;background:#142b46;color:#fff"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase">Elon Store</div><div style="margin-top:9px;font-family:Georgia,serif;font-size:30px">Made for home.</div></td></tr><tr><td style="padding:40px 36px"><p style="margin:0 0 22px;font-size:16px;line-height:1.55">Hi ${escapeHtml(greeting)},</p><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.1">${escapeHtml(title)}</h1><p style="margin:0 0 28px;color:#53605d;font-size:16px;line-height:1.6">${escapeHtml(detail)}</p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:15px 22px;background:#142b46;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:.4px">${escapeHtml(actionLabel)} →</a><p style="margin:30px 0 0;padding-top:20px;border-top:1px solid #d9ddd3;color:#737b76;font-size:12px;line-height:1.55">${escapeHtml(note)}</p></td></tr></table></td></tr></table></body></html>`;
  const textContent = `Hi ${greeting},\n\n${title}\n${detail}\n\n${actionLabel}: ${actionUrl}\n\n${note}`;
  return { htmlContent, textContent };
}

export function sendAccountWelcomeEmail({ user }) {
  return sendEmail({ to: user.email, subject: "Welcome to Elon Store", ...actionEmail({ greeting: user.name, title: "Your account is approved.", detail: "Welcome to Elon Store. Your account is ready to use, so you can sign in, save favourites, and shop with ease.", actionLabel: "Start shopping", actionUrl: config.frontendUrl }) });
}

export function sendPasswordResetEmail({ user, token }) {
  const actionUrl = `${config.backendUrl}/api/auth/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({ to: user.email, subject: "Reset your Elon Store password", ...actionEmail({ greeting: user.name, title: "Reset your password", detail: "Use the link below to choose a new password.", actionLabel: "Reset password", actionUrl, expiry: "one hour" }) });
}

export function sendOrderConfirmationEmail(order) {
  const itemRows = order.items.map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity} — ₦${Number(item.price * item.quantity).toLocaleString()}</li>`).join("");
  return sendEmail({ to: order.shipping.email, subject: `Order confirmed: ${order.orderNumber}`, htmlContent: `<p>Hi ${escapeHtml(order.shipping.firstName)},</p><h2>Thanks for your order</h2><p>Your payment was received and order <strong>${escapeHtml(order.orderNumber)}</strong> is now processing.</p><ul>${itemRows}</ul><p>Total: <strong>₦${Number(order.total).toLocaleString()}</strong></p>`, textContent: `Hi ${order.shipping.firstName},\n\nYour payment was received. Order ${order.orderNumber} is now processing. Total: ₦${Number(order.total).toLocaleString()}.` });
}

export function sendProductUploadConfirmationEmail({ user, product }) {
  return sendEmail({ to: user.email, subject: `Product uploaded: ${product.name}`, htmlContent: `<p>Hi ${escapeHtml(user.name)},</p><h2>Product uploaded successfully</h2><p><strong>${escapeHtml(product.name)}</strong> has been added to the catalog with ${product.stock} unit(s) in stock.</p>`, textContent: `Hi ${user.name},\n\n${product.name} has been added to the catalog with ${product.stock} unit(s) in stock.` });
}

export async function sendOrderConfirmationIfNeeded(order) {
  if (!order || order.confirmationEmailSentAt) return;
  await sendOrderConfirmationEmail(order);
  await Order.updateOne({ _id: order._id, confirmationEmailSentAt: { $exists: false } }, { $set: { confirmationEmailSentAt: new Date() } });
}
