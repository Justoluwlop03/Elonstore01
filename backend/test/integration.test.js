import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
let cloudinary;
let originalUploadStream;

process.env.NODE_ENV = "test";
process.env.JWT_EXPIRE = "1h";
process.env.ADMIN_INVITE_CODE = "test-bootstrap-code";
process.env.PAYSTACK_SECRET_KEY = "test-paystack-secret";
process.env.BREVO_API_KEY = "test-brevo-key";
process.env.BREVO_SENDER_EMAIL = "test@example.com";

const originalFetch = globalThis.fetch;
let replSet;
let app;
let User;
let Product;
let Order;
let agent;
let adminAgent;
let customer;
let admin;
let product;

const shipping = { email: "customer@example.com", phone: "08000000000", country: "Nigeria", firstName: "Test", lastName: "Customer", address: "1 Test Street", city: "Lagos", postalCode: "100001" };

function paystackResponse(url, body) {
    if (url.endsWith("/transaction/initialize")) return { ok: true, json: async () => ({ status: true, data: { authorization_url: "https://paystack.test/pay", reference: body.reference } }) };
    if (url.includes("/transaction/verify/")) return { ok: true, json: async () => ({ status: true, data: { reference: decodeURIComponent(url.split("/transaction/verify/")[1]), amount: 20000, currency: "NGN", status: "success", paid_at: new Date().toISOString() } }) };
    return { ok: true, json: async () => ({}) };
}

before(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = replSet.getUri();
    await mongoose.connect(process.env.MONGODB_URI);
    ({ v2: cloudinary } = await import("cloudinary"));
    originalUploadStream = cloudinary.uploader.upload_stream;
    globalThis.fetch = async (url, options = {}) => {
        if (String(url).includes("api.paystack.co")) return paystackResponse(String(url), JSON.parse(options.body || "{}"));
        return { ok: true, json: async () => ({}) };
    };
    cloudinary.uploader.upload_stream = (_options, callback) => ({ end: () => callback(null, { secure_url: "https://images.test/product.jpg", public_id: "test/products/image" }) });
    ({ app } = await import("../server.js"));
    ({ User } = await import("../models/User.js"));
    ({ Product } = await import("../models/Product.js"));
    ({ Order } = await import("../models/Order.js"));
    agent = request.agent(app);
    adminAgent = request.agent(app);
    const adminSignup = await adminAgent.post("/api/auth/register-admin").send({ name: "Admin", email: "admin@example.com", password: "password123", inviteCode: "test-bootstrap-code" });
    assert.equal(adminSignup.status, 201);
    admin = adminSignup.body.user;
    const customerSignup = await agent.post("/api/auth/register").send({ name: "Customer", email: shipping.email, password: "password123" });
    assert.equal(customerSignup.status, 201);
    customer = customerSignup.body.user;
    const category = await (await import("../models/Category.js")).Category.create({ name: "Kitchen" });
    const productResponse = await Product.create({ name: "Test Kettle", slug: "test-kettle", category: category.name, price: 100, stock: 3, images: [{ url: "https://images.test/product.jpg", publicId: "test/products/image" }] });
    product = productResponse;
});

afterEach(async () => {
    await Order.deleteMany({});
    await Product.updateOne({ _id: product._id }, { $set: { stock: 3, active: true } });
});

after(async () => {
    globalThis.fetch = originalFetch;
    cloudinary.uploader.upload_stream = originalUploadStream;
    await mongoose.disconnect();
    await replSet.stop();
});

test("registers and logs in users", async () => {
    const response = await request(app).post("/api/auth/register").send({ name: "New User", email: "new@example.com", password: "password123" });
    assert.equal(response.status, 201);
    const login = await request(app).post("/api/auth/login").send({ email: "new@example.com", password: "password123" });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.email, "new@example.com");
});

test("rejects expired sessions", async () => {
    const token = (await import("jsonwebtoken")).default.sign({ sub: customer.id }, process.env.JWT_SECRET, { expiresIn: "1ms" });
    const response = await request(app).get("/api/auth/me").set("Cookie", `access_token=${token}`);
    assert.equal(response.status, 401);
});

test("protects admin routes from customers", async () => {
    assert.equal((await agent.get("/api/orders")).status, 403);
    assert.equal((await agent.post("/api/auth/admins").send({ name: "No", email: "no@example.com", password: "password123" })).status, 403);
});

test("uploads, edits, and deletes a product for admins", async () => {
    const upload = await adminAgent.post("/api/products").field("name", "Uploaded Product").field("category", "Kitchen").field("price", "250").field("stock", "4").attach("images", Buffer.from("image"), "product.jpg");
    assert.equal(upload.status, 201);
    const slug = upload.body.product.slug;
    const edit = await adminAgent.patch(`/api/products/${slug}`).send({ name: "Edited Product", category: "Kitchen", price: 300, stock: 5, description: "Updated" });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.product.name, "Edited Product");
    assert.equal((await adminAgent.delete(`/api/products/${slug}`)).status, 204);
});

test("creates an order and decrements stock only after payment succeeds", async () => {
    const orderResponse = await agent.post("/api/orders").send({ items: [{ slug: product.slug, quantity: 2 }], shipping });
    assert.equal(orderResponse.status, 201);
    assert.equal(orderResponse.body.order.payment.status, "pending");
    assert.equal((await Product.findById(product._id)).stock, 3);
    const reference = orderResponse.body.reference;
    const verify = await agent.post("/api/orders/payment/verify").send({ reference });
    assert.equal(verify.status, 200);
    assert.equal(verify.body.order.payment.status, "success");
    assert.equal((await Product.findById(product._id)).stock, 1);
});

test("rejects insufficient stock and prevents a stock race", async () => {
    const requests = Array.from({ length: 2 }, () => agent.post("/api/orders").send({ items: [{ slug: product.slug, quantity: 2 }], shipping }));
    const responses = await Promise.all(requests);
    assert.equal(responses.filter((response) => response.status === 201).length, 2);
    const references = responses.filter((response) => response.status === 201).map((response) => response.body.reference);
    const verified = await Promise.all(references.map((reference) => agent.post("/api/orders/payment/verify").send({ reference })));
    assert.equal(verified.filter((response) => response.status === 200).length, 1);
    assert.equal((await Product.findById(product._id)).stock, 1);
});

test("records payment failure without reducing stock", async () => {
    globalThis.fetch = async (url, options = {}) => String(url).includes("api.paystack.co") && String(url).includes("/verify/")
        ? { ok: true, json: async () => ({ status: true, data: { reference: JSON.parse(options.body || "{}").reference, amount: 999, currency: "NGN", status: "failed", gateway_response: "Declined" } }) }
        : paystackResponse(String(url), JSON.parse(options.body || "{}"));
    const orderResponse = await agent.post("/api/orders").send({ items: [{ slug: product.slug, quantity: 1 }], shipping });
    const verify = await agent.post("/api/orders/payment/verify").send({ reference: orderResponse.body.reference });
    assert.equal(verify.status, 402);
    assert.equal((await Product.findById(product._id)).stock, 3);
    const order = await Order.findOne({ "payment.reference": orderResponse.body.reference });
    assert.equal(order.payment.status, "failed");
});
