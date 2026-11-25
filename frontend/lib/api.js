const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api")
  .replace(/\/+$/, "");

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `Could not reach the API at ${API_URL}. Start the backend with MongoDB configured and running, and check NEXT_PUBLIC_API_URL.`,
    );
  }

  const text = await response.text();
  let data = text;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message =
      typeof data === "string" ? data : data?.message || response.statusText;
    throw new Error(message || `Request failed (${response.status}).`);
  }
  return data;
}

// Store categories and their photos (frontend/public/products).
export const CATEGORY_GROUPS = [
  {
    name: "Technology",
    subline: "For the desk",
    images: ["/products/macbook.jpg", "/products/macmini.jpg", "/products/magicmouse.jpg", "/products/spatial-computing.jpg"],
    keywords: ["tech", "phone", "laptop", "computer", "mac", "monitor", "electronic", "tablet", "watch", "audio", "headphone", "keyboard", "mouse", "camera", "gadget", "vision"],
  },
  {
    name: "Skin & care",
    subline: "A softer routine",
    images: ["/products/beauty1.jpg", "/products/beauty2.jpg", "/products/beauty3.jpg", "/products/home4.jpg"],
    keywords: ["skin", "care", "beauty", "cosmetic", "makeup", "serum", "hair", "perfume", "fragrance", "lotion", "cream"],
  },
  {
    name: "Home & living",
    subline: "Quiet spaces",
    images: ["/products/home1.jpg", "/products/home2.jpg", "/products/home3.jpg"],
    keywords: ["home", "living", "furniture", "decor", "kitchen", "lamp", "chair", "sofa", "shelf", "book", "bed", "cushion"],
  },
  {
    name: "Little treats",
    subline: "Small rituals",
    images: ["/products/treat1.jpg", "/products/treat2.jpg", "/products/treat3.jpg", "/products/treat4.jpg"],
    keywords: ["treat", "dessert", "candy", "sweet", "snack", "food", "chocolate", "mint", "cacao", "tea", "coffee"],
  },
];

export function categoryGroupFor(category) {
  const value = String(category || "").toLowerCase();
  return CATEGORY_GROUPS.find(
    (group) => group.name.toLowerCase() === value || group.keywords.some((word) => value.includes(word)),
  ) || null;
}

export function imageFor(product) {
  if (product?.imageUrls?.[0]) return product.imageUrls[0];
  const group = categoryGroupFor(product?.category);
  const images = group ? group.images : CATEGORY_GROUPS.flatMap((item) => item.images);
  const key = String(product?._id || product?.name || "");
  const hash = [...key].reduce((total, char) => total + char.charCodeAt(0), 0);
  return images[hash % images.length];
}

export function formatPrice(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;
}
