export function validateOrderItems(items) {
  if (!Array.isArray(items) || !items.length) return "Your order must contain at least one product.";
  for (const item of items) {
    if (!item?.slug || !Number.isInteger(item.quantity) || item.quantity < 1) return "Each order item needs a valid quantity.";
  }
  return null;
}

export function aggregateQuantities(items) {
  const quantities = new Map();
  for (const item of items) quantities.set(item.slug, (quantities.get(item.slug) || 0) + item.quantity);
  return quantities;
}

export function validateShipping(shipping = {}) {
  const required = ["email", "phone", "country", "firstName", "lastName", "address", "city", "postalCode"];
  return required.every((field) => typeof shipping[field] === "string" && shipping[field].trim()) && /^\S+@\S+\.\S+$/.test(shipping.email);
}
