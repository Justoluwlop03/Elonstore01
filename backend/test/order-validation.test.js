import test from "node:test";
import assert from "node:assert/strict";
import { aggregateQuantities, validateOrderItems, validateShipping } from "../services/order-validation.js";

test("rejects empty and malformed orders", () => {
  assert.equal(validateOrderItems([]), "Your order must contain at least one product.");
  assert.equal(validateOrderItems([{ slug: "kettle", quantity: 0 }]), "Each order item needs a valid quantity.");
  assert.equal(validateOrderItems([{ slug: "kettle", quantity: 1 }]), null);
});

test("aggregates repeated cart lines for stock checks", () => {
  assert.deepEqual([...aggregateQuantities([{ slug: "kettle", quantity: 2 }, { slug: "kettle", quantity: 1 }])], [["kettle", 3]]);
});

test("requires complete valid delivery details", () => {
  const shipping = { email: "buyer@example.com", phone: "+234 800 000 0000", country: "Nigeria", firstName: "Ada", lastName: "Lovelace", address: "1 Main Street", city: "Lagos", postalCode: "100001" };
  assert.equal(validateShipping(shipping), true);
  assert.equal(validateShipping({ ...shipping, email: "invalid" }), false);
  assert.equal(validateShipping({ ...shipping, city: "" }), false);
});
