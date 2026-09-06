const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Request failed. Please try again.");
  if (response.status !== 204 && data === null) throw new Error("The API returned an invalid response.");
  return data;
}

export function toStoreProduct(product) {
  return {
    ...product,
    id: product.slug,
    image: product.images?.[0]?.url || "",
    rating: product.rating || 5,
  };
}
