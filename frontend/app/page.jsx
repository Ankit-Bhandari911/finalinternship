"use client";

import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Leaf,
  LogOut,
  Menu,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Store,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PasswordInput from "./components/PasswordInput";
import ThemeToggle from "./components/ThemeToggle";
import {
  CATEGORY_GROUPS,
  apiRequest,
  formatPrice,
  imageFor,
} from "../lib/api";

// Shown only when the products API can't be reached.
const SAMPLE_PRODUCTS = [
  { _id: "sample-macbook", name: "MacBook Air", brand: "Apple", category: "Technology", price: 165000, stock: 4, imageUrls: ["/products/macbook.jpg"], description: "A thin, quiet laptop with all-day battery for work, study and everything after." },
  { _id: "sample-macmini", name: "Mac mini", brand: "Apple", category: "Technology", price: 89000, stock: 6, imageUrls: ["/products/macmini.jpg"], description: "A small desktop that fits anywhere and handles far more than its size suggests." },
  { _id: "sample-magicmouse", name: "Magic Mouse", brand: "Apple", category: "Technology", price: 12500, stock: 12, imageUrls: ["/products/magicmouse.jpg"], description: "A smooth, rechargeable mouse with a multi-touch surface for quick gestures." },
  { _id: "sample-vision", name: "Vision Pro", brand: "Apple", category: "Technology", price: 520000, stock: 2, imageUrls: ["/products/spatial-computing.jpg"], description: "Spatial computing headset that blends apps and media with the room around you." },
  { _id: "sample-beauty1", name: "Blush Skincare Set", brand: "Rosa Studio", category: "Skin & care", price: 6400, stock: 8, imageUrls: ["/products/beauty1.jpg"], description: "Cleanser, cream and serum in one soft-pink set for a simple daily routine." },
  { _id: "sample-beauty2", name: "Daily Serum Trio", brand: "Botanica Lab", category: "Skin & care", price: 4200, stock: 10, imageUrls: ["/products/beauty2.jpg"], description: "Three lightweight serums for hydration, glow and an even skin tone." },
  { _id: "sample-beauty3", name: "Clay Face Mask", brand: "Himal Botanics", category: "Skin & care", price: 1850, stock: 15, imageUrls: ["/products/beauty3.jpg"], description: "A calming clay mask blended with dried flowers for a weekend reset." },
  { _id: "sample-home4", name: "Rose Beauty Edit", brand: "Maison Rose", category: "Skin & care", price: 7800, stock: 5, imageUrls: ["/products/home4.jpg"], description: "A curated set of rose fragrance, balm and everyday makeup essentials." },
  { _id: "sample-home1", name: "Floating Wall Shelves", brand: "Oak & Clay", category: "Home & living", price: 18500, stock: 3, imageUrls: ["/products/home1.jpg"], description: "Modular wall shelves that keep plants, books and keepsakes in easy reach." },
  { _id: "sample-home2", name: "Library Bookcase", brand: "Oak & Clay", category: "Home & living", price: 42000, stock: 2, imageUrls: ["/products/home2.jpg"], description: "A tall, built-in style bookcase that turns any wall into a reading corner." },
  { _id: "sample-home3", name: "Linen Lounge Sofa", brand: "Common Ground Home", category: "Home & living", price: 68000, stock: 2, imageUrls: ["/products/home3.jpg"], description: "A deep, soft sofa made for slow mornings and long afternoons." },
  { _id: "sample-treat1", name: "Strawberry Mint Tin", brand: "Kaski Sweets", category: "Little treats", price: 350, stock: 40, imageUrls: ["/products/treat1.jpg"], description: "A pocket tin of pink strawberry mints for a little sweetness on the go." },
  { _id: "sample-treat2", name: "Millions Chew Sticks", brand: "Millions", category: "Little treats", price: 250, stock: 60, imageUrls: ["/products/treat2.jpg"], description: "Fruity chewy sweets in apple and blueberry, the classic tube." },
  { _id: "sample-treat3", name: "Apple Gummy Jar", brand: "Kaski Sweets", category: "Little treats", price: 480, stock: 30, imageUrls: ["/products/treat3.jpg"], description: "A glass jar of tangy green apple gummies, good for sharing." },
  { _id: "sample-treat4", name: "Pink Meringue Kisses", brand: "Patan Bakehouse", category: "Little treats", price: 650, stock: 20, imageUrls: ["/products/treat4.jpg"], description: "Light, crisp meringues with a soft strawberry swirl." },
];

const PAGE_SIZE = 12;

const primaryButton =
  "inline-flex items-center justify-center gap-gutter-sm rounded bg-light-primary text-light-on-primary font-label text-label-lg transition-colors duration-state-change hover:bg-light-primary-container disabled:opacity-60";
const roundIconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface transition-colors duration-state-change hover:bg-light-surface-container";

function ProductCard({ product, onAdd, onOpen }) {
  return (
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-md border border-light-outline-variant bg-light-surface-container-lowest transition-colors duration-state-change hover:border-light-outline">
      <button type="button" onClick={() => onOpen(product)} className="text-left focus:outline-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-light-surface-container-low">
          <img src={imageFor(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-image-hover ease-image-hover group-hover:scale-[1.03]" />
          {product.category && <span className="absolute left-3 top-3 rounded-full border border-light-outline-variant bg-light-surface-container-lowest px-2.5 py-1 font-label text-label-sm text-light-on-surface">{product.category}</span>}
        </div>
        <div className="flex flex-col gap-1 p-gutter-md pb-2">
          <span className="font-label text-label-sm uppercase text-light-on-surface-variant">{product.brand || "Common Ground"}</span>
          <h3 className="font-title text-title-md text-light-on-surface transition-colors group-hover:text-light-primary">{product.name}</h3>
        </div>
      </button>
      <footer className="mt-auto flex items-center justify-between gap-gutter-sm border-t border-light-surface-container px-gutter-md pb-gutter-md pt-gutter-sm">
        <span className="font-mono text-mono-md tabular-nums text-light-on-surface">{formatPrice(product.price)}</span>
        <button type="button" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to bag`} className="inline-flex items-center gap-1 rounded bg-light-primary px-3 py-1.5 font-label text-label-md text-light-on-primary transition-colors duration-state-change hover:bg-light-primary-container">
          <Plus size={16} aria-hidden="true" />
          <span>Add</span>
        </button>
      </footer>
    </article>
  );
}

export default function Home() {
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState([]);
  const [panel, setPanel] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [orders, setOrders] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [checkout, setCheckout] = useState({ city: "", province: "", street: "", country: "Nepal" });
  const accountRef = useRef(null);
  const noticeTimer = useRef(null);

  useEffect(() => {
    try {
      const savedUser = window.localStorage.getItem("cg-user");
      const savedToken = window.localStorage.getItem("cg-token");
      const savedCart = window.localStorage.getItem("cg-cart");
      setSavedEmail(window.localStorage.getItem("cg-last-email") || "");
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        if (savedCart) setCart(JSON.parse(savedCart));
      } else {
        window.localStorage.removeItem("cg-cart");
      }
    } catch {
      window.localStorage.removeItem("cg-user");
      window.localStorage.removeItem("cg-token");
      window.localStorage.removeItem("cg-cart");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const items = await apiRequest("/products");
      if (!Array.isArray(items)) {
        throw new Error("The products API returned an unexpected response.");
      }
      setProducts(items);
      setApiError("");
    } catch (error) {
      setApiError(error.message);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    window.localStorage.setItem("cg-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const close = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [accountOpen]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = products.filter((product) => {
      const matchesCategory =
        activeCategory === "all" ||
        product.category?.trim().toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !query ||
        [product.name, product.brand, product.category].some((value) => value?.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
    if (sort === "price-asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [products, activeCategory, search, sort]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMoreProducts = visibleCount < filteredProducts.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, search, sort]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMoreProducts) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((count) => count + PAGE_SIZE);
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreProducts, visibleCount]);

  const categories = useMemo(() => {
    const names = new Map();
    products.forEach((product) => {
      const name = product.category?.trim();
      if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
    });
    const groupOrder = CATEGORY_GROUPS.map((group) => group.name.toLowerCase());
    return [...names.entries()]
      .sort(([a], [b]) => {
        const ia = groupOrder.indexOf(a);
        const ib = groupOrder.indexOf(b);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return a.localeCompare(b);
      })
      .map(([, name]) => name);
  }, [products]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const isMerchant = user?.roles?.includes("MERCHANT");

  const showNotice = (message, timeout) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(message);
    if (timeout) noticeTimer.current = window.setTimeout(() => setNotice(""), timeout);
  };

  const addToCart = (product) => {
    if (!user || !token) {
      setSelectedProduct(null);
      openAuth("login");
      showNotice("Sign in to add items to your bag.", 3000);
      return;
    }
    setCart((current) => {
      const found = current.find((item) => item._id === product._id);
      return found
        ? current.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }];
    });
    showNotice("Added to your bag.", 1800);
  };

  const changeQuantity = (id, amount) => {
    setCart((current) => current
      .map((item) => item._id === id ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  };

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setApiError("");
    setPanel("auth");
  };

  const showOrders = async () => {
    setAccountOpen(false);
    setMobileMenu(false);
    if (!token) {
      openAuth("login");
      showNotice("Sign in to see your orders.");
      return;
    }
    setPanel("orders");
    try {
      const result = await apiRequest("/orders/user", { token });
      setOrders(Array.isArray(result) ? result : []);
    } catch (error) {
      handleRequestError(error);
    }
  };

  const openAccount = () => {
    if (user) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setAccountOpen(true);
    } else {
      openAuth("login");
    }
  };

  const jumpToCategory = (name) => {
    setActiveCategory(name);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setApiError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
    };
    if (authMode === "register") {
      payload.confirmPassword = values.confirmPassword;
      payload.phone = values.phone;
      payload.address = {
        city: values.city,
        province: values.province,
        street: values.street,
        country: "Nepal",
      };
    }
    try {
      if (authMode === "forgot") {
        const result = await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: values.email }),
        });
        setPanel(null);
        showNotice(result.message || "Check your inbox for a password reset link.");
        return;
      }
      const result = await apiRequest(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!result.authToken) throw new Error("The API did not return an authentication token.");
      const { authToken, ...profile } = result;
      setUser(profile);
      setToken(authToken);
      window.localStorage.setItem("cg-user", JSON.stringify(profile));
      window.localStorage.setItem("cg-token", authToken);
      if (values.email) {
        window.localStorage.setItem("cg-last-email", values.email);
        setSavedEmail(values.email);
      }
      setPanel(null);
      setApiError("");
      showNotice(`Welcome${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}.`, 3000);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setBusy(false);
    }
  };

  // The API rejects expired or invalid tokens. Clear the local session so the
  // user can sign in again instead of staying stuck in a broken signed-in state.
  const handleRequestError = (error) => {
    if (/auth token|not authenticated/i.test(error.message)) {
      setUser(null);
      setToken("");
      setCart([]);
      setOrders([]);
      window.localStorage.removeItem("cg-user");
      window.localStorage.removeItem("cg-token");
      window.localStorage.removeItem("cg-cart");
      setPanel("auth");
      setAuthMode("login");
      setApiError("Your session expired. Please sign in again.");
      return;
    }
    setApiError(error.message);
  };

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST", token });
    } catch (error) {
      setApiError(error.message);
    }
    setUser(null);
    setToken("");
    window.localStorage.removeItem("cg-user");
    window.localStorage.removeItem("cg-token");
    window.localStorage.removeItem("cg-cart");
    setCart([]);
    setOrders([]);
    setAccountOpen(false);
    setPanel(null);
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!user || !token) {
      openAuth("login");
      return;
    }
    if (!cart.length) return;
    setBusy(true);
    setApiError("");
    try {
      const order = await apiRequest("/orders", {
        method: "POST",
        token,
        body: JSON.stringify({
          orderItems: cart.map((item) => ({ product: item._id, quantity: item.quantity })),
          totalPrice: cartTotal,
          shippingAddress: checkout,
        }),
      });
      const payment = await apiRequest(`/orders/${order._id}/payment/khalti`, {
        method: "POST",
        token,
      });
      if (!payment.payment_url) {
        throw new Error("Your order was created, but the API did not return a Khalti payment link.");
      }
      setCart([]);
      window.location.assign(payment.payment_url);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setBusy(false);
    }
  };

  const closePanel = () => {
    setPanel(null);
    setApiError("");
  };

  const panelTitle = panel === "cart"
    ? "Your bag"
    : panel === "checkout"
      ? "Checkout"
      : panel === "orders"
        ? "Your orders"
        : authMode === "register"
          ? "Join us"
          : authMode === "forgot"
            ? "Reset password"
            : "Welcome back";

  const navLink = "font-label text-label-lg text-light-on-surface-variant transition-colors duration-state-change hover:text-light-primary";

  const searchBox = (className) => (
    <form role="search" onSubmit={(event) => { event.preventDefault(); setMobileMenu(false); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }} className={`relative h-10 items-center rounded border border-light-outline-variant bg-light-surface-container-lowest transition-colors duration-state-change focus-within:border-light-primary ${className}`}>
      <Search size={18} aria-hidden="true" className="ml-3 shrink-0 text-light-on-surface-variant" />
      <input type="search" aria-label="Search products by name" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search goods..." className="w-full bg-transparent py-2 pl-2 pr-3 font-body text-body-md text-light-on-surface outline-none placeholder:text-light-on-surface-variant" />
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col bg-light-surface font-body text-light-on-surface antialiased selection:bg-accent selection:text-on-accent">
      <div className="bg-light-primary px-gutter-md py-2 text-center font-label text-label-sm uppercase tracking-wider text-light-on-primary">
        Free delivery on orders over Rs. 5,000
      </div>

      <header className="sticky top-0 z-30 border-b border-light-outline-variant bg-light-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-gutter-lg px-gutter-lg py-4 lg:px-page-margin">
          <div className="flex items-center gap-gutter-xl">
            <button type="button" aria-label="Open menu" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden">
              <Menu size={22} />
            </button>
            <a href="#" onClick={() => setActiveCategory("all")} className="flex items-baseline font-headline text-headline-md tracking-tight text-light-on-surface">
              <span>common</span><span className="italic text-light-primary">ground.</span>
            </a>
            <nav aria-label="Primary" className="hidden items-center gap-gutter-lg md:flex">
              <a href="#catalog" onClick={() => setActiveCategory("all")} className="font-label text-label-lg text-light-on-surface transition-colors duration-state-change hover:text-light-primary">Shop all</a>
              <a href="#collections" className={navLink}>Collections</a>
              <button type="button" onClick={showOrders} className={navLink}>Your orders</button>
            </nav>
          </div>

          <div className="flex max-w-md flex-1 items-center justify-end gap-gutter-sm">
            {searchBox("hidden w-full max-w-xs sm:flex")}

            <ThemeToggle className={roundIconButton} />

            <div ref={accountRef} className="relative">
              <button type="button" aria-label={user ? "Account menu" : "Sign in"} aria-expanded={accountOpen} onClick={() => user ? setAccountOpen(!accountOpen) : openAuth("login")} className={`${roundIconButton} overflow-hidden`}>
                {user?.profileImageUrl ? <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={20} />}
              </button>
              {accountOpen && user && (
                <div className="absolute right-0 z-40 mt-2 w-64 rounded-md border border-light-outline-variant bg-light-surface-container-lowest p-gutter-md shadow-lg">
                  <div className="mb-3 border-b border-light-surface-container pb-3">
                    <p className="font-title text-title-md text-light-on-surface">{user.name}</p>
                    <p className="truncate font-body text-body-md text-light-on-surface-variant">{user.email}</p>
                  </div>
                  <ul className="flex flex-col gap-1">
                    <li>
                      <button type="button" onClick={showOrders} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left font-body text-body-md text-light-on-surface hover:bg-light-surface-container">
                        <ReceiptText size={18} className="text-light-on-surface-variant" /><span>Your orders</span>
                      </button>
                    </li>
                    {isMerchant && (
                      <li>
                        <a href="/dashboard" className="flex items-center gap-2 rounded px-2.5 py-2 font-body text-body-md text-light-on-surface hover:bg-light-surface-container">
                          <Store size={18} className="text-light-on-surface-variant" /><span>Merchant studio</span>
                        </a>
                      </li>
                    )}
                    <li className="mt-1 border-t border-light-surface-container pt-1">
                      <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left font-body text-body-md text-light-error hover:bg-light-error-container/40">
                        <LogOut size={18} /><span>Sign out</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <button type="button" onClick={() => setPanel("cart")} aria-label={`Shopping bag, ${cartCount} items`} className="inline-flex h-10 items-center gap-2 rounded-full border border-light-outline-variant bg-light-surface-container-lowest px-3.5 font-label text-label-md text-light-on-surface transition-colors duration-state-change hover:bg-light-surface-container">
              <ShoppingBag size={18} aria-hidden="true" />
              <span>Bag</span>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-light-primary px-1.5 font-mono text-mono-sm tabular-nums text-light-on-primary">{cartCount}</span>
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="flex flex-col gap-gutter-md border-t border-light-outline-variant bg-light-surface px-gutter-lg py-gutter-md md:hidden">
            {searchBox("flex w-full")}
            <a href="#catalog" onClick={() => { setActiveCategory("all"); setMobileMenu(false); }} className="font-label text-label-lg">Shop all</a>
            <a href="#collections" onClick={() => setMobileMenu(false)} className="font-label text-label-lg">Collections</a>
            <button type="button" onClick={showOrders} className="text-left font-label text-label-lg">Your orders</button>
          </div>
        )}
      </header>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-[92px] z-20">
          <div className="pointer-events-auto mx-auto w-full max-w-7xl px-gutter-lg lg:px-page-margin">
            <div role="status" className="flex items-center justify-between gap-gutter-md rounded-md border border-success/20 bg-success-container px-gutter-md py-3 text-on-success-container shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} />
                <p className="font-body text-body-md">{notice}</p>
              </div>
              <button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")} className="rounded p-1 hover:bg-success/10"><X size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-gutter-lg py-section lg:px-page-margin lg:py-section-lg">
          <div className="grid grid-cols-1 items-center gap-gutter-xl lg:grid-cols-12">
            <div className="flex flex-col items-start gap-gutter-lg lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-light-outline-variant bg-light-surface-container px-3 py-1 font-label text-label-sm uppercase tracking-wider text-light-on-surface-variant">
                <Leaf size={14} className="text-light-primary" />
                Curated for the everyday
              </span>
              <h1 className="text-balance font-display text-display-lg-mobile text-light-on-surface lg:text-display-lg">
                Objects for <em className="font-normal italic text-light-primary">unhurried</em> living.
              </h1>
              <p className="max-w-prose text-pretty font-body text-body-lg text-light-on-surface-variant">
                Thoughtful everyday finds: tactile tech, small-batch self-care, calm home pieces and a few little treats.
              </p>
              <div className="flex flex-wrap items-center gap-gutter-md pt-1">
                <a href="#catalog" onClick={() => setActiveCategory("all")} className={`${primaryButton} px-gutter-lg py-3.5`}>
                  <span>Browse the collection</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a href="#collections" className="font-label text-label-lg text-light-on-surface underline underline-offset-4 hover:text-light-primary">
                  Explore by mood
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-light-outline-variant bg-light-surface-container-low">
                <img src="/products/home3.jpg" alt="A soft linen sofa with orange cushions beside a plant shelf" className="h-full w-full object-cover" />
                <div className="absolute bottom-4 left-4 right-4 hidden items-center justify-between gap-gutter-md rounded border border-light-outline-variant bg-light-surface-container-lowest p-gutter-md sm:flex">
                  <div>
                    <p className="font-label text-label-sm uppercase tracking-wider text-light-on-surface-variant">On the shelves now</p>
                    <p className="font-title text-title-md text-light-on-surface">Tech, care, home and treats</p>
                  </div>
                  <span className="rounded bg-light-surface-container px-2.5 py-1 font-mono text-mono-sm tabular-nums text-light-on-surface">{products.length} pieces</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="collections" className="scroll-mt-24 border-y border-light-outline-variant bg-light-surface-container-low py-section">
          <div className="mx-auto max-w-7xl px-gutter-lg lg:px-page-margin">
            <div className="mb-gutter-lg flex items-end justify-between gap-gutter-md">
              <div>
                <p className="mb-1 font-label text-label-sm uppercase tracking-wider text-light-on-surface-variant">Curated shelves</p>
                <h2 className="font-headline text-headline-lg-mobile text-light-on-surface lg:text-headline-lg">Browse by mood</h2>
              </div>
              <button type="button" onClick={() => jumpToCategory("all")} className="font-label text-label-lg text-light-primary underline-offset-4 hover:underline">
                View all goods
              </button>
            </div>

            <div className="grid grid-cols-1 gap-gutter-lg sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORY_GROUPS.map((group) => (
                <button key={group.name} type="button" onClick={() => jumpToCategory(group.name)} className="group relative aspect-[4/3] overflow-hidden rounded-md border border-light-outline-variant bg-light-surface-container-high text-left">
                  <img src={group.images[0]} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-image-hover ease-image-hover group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-light-on-surface/90 via-light-on-surface/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-gutter-md text-light-on-primary">
                    <p className="font-label text-label-sm uppercase tracking-wider">{group.subline}</p>
                    <p className="font-headline text-headline-md">{group.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="catalog" className="mx-auto max-w-7xl scroll-mt-24 px-gutter-lg py-section lg:px-page-margin lg:py-section-lg">
          <div className="mb-gutter-lg flex flex-col justify-between gap-gutter-md md:flex-row md:items-end">
            <div>
              <p className="mb-1 font-label text-label-sm uppercase tracking-wider text-light-on-surface-variant">Picked for the everyday</p>
              <h2 className="font-headline text-headline-lg-mobile text-light-on-surface lg:text-headline-lg">A few good finds.</h2>
            </div>
            <div className="flex flex-wrap items-center gap-gutter-sm">
              <label htmlFor="sort-select" className="font-label text-label-md text-light-on-surface-variant">Sort by</label>
              <select id="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded border border-light-outline-variant bg-light-surface-container-lowest py-2 pl-3 pr-8 font-body text-body-md text-light-on-surface outline-none focus:border-light-primary">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
              </select>
            </div>
          </div>

          <div role="group" aria-label="Filter by category" className="mb-gutter-xl flex flex-wrap items-center gap-gutter-sm">
            {[{ name: "all", label: "Everything" }, ...categories.map((name) => ({ name, label: name }))].map((chip) => {
              const active = activeCategory === chip.name;
              return (
                <button key={chip.name} type="button" aria-pressed={active} onClick={() => setActiveCategory(chip.name)} className={`inline-flex items-center rounded-full px-4 py-2 font-label text-label-md transition-colors duration-state-change ${active ? "bg-light-primary text-light-on-primary" : "border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface-variant hover:border-light-outline"}`}>
                  {chip.label}
                </button>
              );
            })}
          </div>

          {filteredProducts.length > 0 ? (
            <>
            <div className="grid grid-cols-1 items-stretch gap-gutter-lg sm:grid-cols-2 lg:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard key={product._id} product={product} onAdd={addToCart} onOpen={setSelectedProduct} />
              ))}
            </div>
            <div ref={loadMoreRef} className="mt-gutter-xl flex flex-col items-center gap-2">
              <p className="font-body text-body-md text-light-on-surface-variant">Showing {visibleProducts.length} of {filteredProducts.length}</p>
              {hasMoreProducts && (
                <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded border border-light-outline-variant bg-light-surface-container-lowest px-5 py-2.5 font-label text-label-md text-light-on-surface transition-colors duration-state-change hover:border-light-primary">Load more</button>
              )}
            </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed border-light-outline-variant bg-light-surface-container-low py-section text-center">
              <p className="mb-1 font-title text-title-md text-light-on-surface">No products match your search</p>
              <p className="mb-gutter-md font-body text-body-md text-light-on-surface-variant">Try another keyword or clear your active category filter.</p>
              <button type="button" onClick={() => { setSearch(""); setActiveCategory("all"); }} className="rounded bg-light-primary px-4 py-2 font-label text-label-md text-light-on-primary">Reset filters</button>
            </div>
          )}

          {apiError && !panel && (
            <div role="status" className="mt-gutter-xl flex items-start gap-3 rounded-md border border-warning/20 bg-warning-container px-gutter-md py-3 font-body text-body-md text-on-warning-container">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <span><strong>Showing the sample collection.</strong> {apiError}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setApiError("")} className="ml-auto rounded p-1 hover:bg-warning/10"><X size={16} /></button>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-gutter-lg pb-section lg:px-page-margin lg:pb-section-lg">
          <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-light-outline-variant bg-light-surface-container-low lg:grid-cols-12">
            <div className="aspect-[16/10] lg:col-span-6 lg:aspect-auto">
              <img src="/products/home2.jpg" alt="A bright room with a tall white bookcase" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col items-start justify-center gap-gutter-md p-gutter-xl lg:col-span-6 lg:p-12">
              <span className="font-label text-label-sm uppercase tracking-wider text-light-primary">A marketplace with a point of view</span>
              <h2 className="text-balance font-headline text-headline-lg-mobile text-light-on-surface lg:text-headline-lg">Good finds feel even better together.</h2>
              <p className="max-w-prose text-pretty font-body text-body-lg text-light-on-surface-variant">
                Every item on Common Ground comes from independent studios and makers. List your craft in minutes.
              </p>
              <a href="/dashboard" className="inline-flex items-center gap-2 border-b-2 border-light-primary pb-1 font-label text-label-lg text-light-on-surface transition-colors duration-state-change hover:text-light-primary">
                <span>Open Merchant Studio</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-light-on-surface py-section text-light-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-gutter-xl px-gutter-lg md:grid-cols-12 lg:px-page-margin">
          <div className="flex flex-col gap-gutter-sm md:col-span-5">
            <span className="font-headline text-headline-md">common<span className="italic text-accent">ground.</span></span>
            <p className="max-w-sm font-body text-body-md text-light-surface/80">Good things for the everyday. Curated tech, self-care, and home comforts from makers we trust.</p>
          </div>
          <div className="flex flex-col items-start gap-2 md:col-span-3">
            <p className="mb-1 font-label text-label-sm uppercase tracking-wider text-light-surface/80">Here to help</p>
            <button type="button" onClick={showOrders} className="font-body text-body-md text-light-surface hover:text-accent">Your orders</button>
            <button type="button" onClick={openAccount} className="font-body text-body-md text-light-surface hover:text-accent">Your account</button>
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <p className="mb-1 font-label text-label-sm uppercase tracking-wider text-light-surface/80">For our makers</p>
            <a href="/dashboard" className="inline-flex items-center gap-1.5 font-body text-body-md text-light-surface hover:text-accent">
              <span>Merchant dashboard</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <p className="mt-auto pt-4 font-body text-body-md text-light-surface/80">© {new Date().getFullYear()} Common Ground. Made for everyday living.</p>
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-light-on-surface/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
          <div role="dialog" aria-modal="true" aria-label={selectedProduct.name} className="grid max-h-[90vh] w-[92vw] max-w-3xl grid-cols-1 overflow-auto rounded-lg border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface shadow-2xl md:grid-cols-2">
            <div className="aspect-[4/3] bg-light-surface-container-low md:aspect-auto">
              <img src={imageFor(selectedProduct)} alt={selectedProduct.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-between gap-gutter-md p-gutter-lg lg:p-gutter-xl">
              <div>
                <div className="mb-gutter-sm flex items-start justify-between gap-2">
                  <span className="font-label text-label-sm uppercase tracking-wider text-light-on-surface-variant">{selectedProduct.brand || "Common Ground"}</span>
                  <button type="button" aria-label="Close product details" onClick={() => setSelectedProduct(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-light-outline-variant hover:bg-light-surface-container">
                    <X size={18} />
                  </button>
                </div>
                <h3 className="mb-2 font-headline text-headline-md text-light-on-surface">{selectedProduct.name}</h3>
                <p className="mb-gutter-md font-mono text-title-lg tabular-nums text-light-primary">{formatPrice(selectedProduct.price)}</p>
                <p className="text-pretty font-body text-body-md text-light-on-surface-variant">{selectedProduct.description || "A thoughtful pick for the everyday. Selected with care by Common Ground."}</p>
              </div>
              <div className="flex items-center justify-between gap-gutter-md border-t border-light-surface-container pt-gutter-md">
                <button type="button" onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className={`${primaryButton} flex-1 px-gutter-lg py-3`}>
                  Add to bag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {panel && (
        <div className="fixed inset-0 z-40 bg-light-on-surface/50" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <aside role="dialog" aria-modal="true" aria-label={panelTitle} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface">
            <header className="flex shrink-0 items-center justify-between border-b border-light-outline-variant p-gutter-lg">
              <h2 className="font-headline text-headline-md">{panelTitle}{panel === "cart" && cartCount > 0 ? ` (${cartCount})` : ""}</h2>
              <button type="button" aria-label="Close panel" onClick={closePanel} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-light-outline-variant hover:bg-light-surface-container">
                <X size={18} />
              </button>
            </header>

            {panel === "cart" && (!cart.length ? (
              <div className="flex flex-1 flex-col items-center justify-center p-gutter-lg text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-light-surface-container"><ShoppingBag size={22} /></div>
                <p className="mt-gutter-md font-title text-title-lg">Your bag is empty.</p>
                <p className="mt-1 max-w-[260px] font-body text-body-md text-light-on-surface-variant">There are good things out there with your name on them.</p>
                <button type="button" onClick={closePanel} className={`${primaryButton} mt-gutter-lg px-gutter-lg py-3`}>Keep looking</button>
              </div>
            ) : (
              <>
                <div className="flex flex-1 flex-col gap-gutter-md overflow-y-auto p-gutter-lg">
                  {cart.map((item) => (
                    <div key={item._id} className="flex items-center gap-gutter-md border-b border-light-surface-container pb-gutter-md">
                      <img src={imageFor(item)} alt={item.name} className="h-16 w-20 rounded border border-light-outline-variant bg-light-surface-container-low object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="font-label text-label-sm uppercase text-light-on-surface-variant">{item.brand || "Common Ground"}</p>
                        <p className="truncate font-title text-title-md text-light-on-surface">{item.name}</p>
                        <p className="font-mono text-mono-sm tabular-nums text-light-on-surface-variant">{formatPrice(item.price)}</p>
                        <button type="button" onClick={() => setCart((current) => current.filter((entry) => entry._id !== item._id))} className="mt-1 font-label text-label-sm text-light-on-surface-variant underline underline-offset-2 hover:text-light-error">Remove</button>
                      </div>
                      <div className="inline-flex items-center rounded border border-light-outline-variant">
                        <button type="button" onClick={() => changeQuantity(item._id, -1)} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center hover:bg-light-surface-container"><Minus size={14} /></button>
                        <span className="w-7 text-center font-mono text-mono-sm tabular-nums">{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item._id, 1)} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center hover:bg-light-surface-container"><Plus size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <footer className="flex flex-col gap-gutter-md border-t border-light-outline-variant bg-light-surface-container-low p-gutter-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-body-lg text-light-on-surface-variant">Subtotal</span>
                    <span className="font-mono text-title-lg tabular-nums text-light-on-surface">{formatPrice(cartTotal)}</span>
                  </div>
                  <button type="button" onClick={() => user ? setPanel("checkout") : openAuth("login")} className={`${primaryButton} w-full px-gutter-lg py-3.5`}>
                    Proceed to checkout <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </footer>
              </>
            ))}

            {panel === "checkout" && (
              <form onSubmit={placeOrder} className="flex flex-1 flex-col overflow-y-auto">
                <div className="flex-1 p-gutter-lg">
                  <p className="mb-1 font-label text-label-sm uppercase tracking-wider text-light-primary">Almost yours</p>
                  <h3 className="font-headline text-headline-md">Where should we send it?</h3>
                  <div className="mt-gutter-lg grid grid-cols-2 gap-gutter-md">
                    <Field label="City" name="city" value={checkout.city} onChange={(event) => setCheckout({ ...checkout, city: event.target.value })} required />
                    <Field label="Province" name="province" value={checkout.province} onChange={(event) => setCheckout({ ...checkout, province: event.target.value })} required />
                    <Field label="Street address" name="street" value={checkout.street} onChange={(event) => setCheckout({ ...checkout, street: event.target.value })} className="col-span-2" />
                    <Field label="Country" name="country" value={checkout.country} onChange={(event) => setCheckout({ ...checkout, country: event.target.value })} className="col-span-2" required />
                  </div>
                  {apiError && <ErrorNote message={apiError} />}
                </div>
                <footer className="flex flex-col gap-gutter-md border-t border-light-outline-variant bg-light-surface-container-low p-gutter-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-body-lg text-light-on-surface-variant">Total</span>
                    <span className="font-mono text-title-lg tabular-nums text-light-on-surface">{formatPrice(cartTotal)}</span>
                  </div>
                  <button disabled={busy} className={`${primaryButton} w-full px-gutter-lg py-3.5`}>
                    {busy ? "Preparing your order..." : "Proceed to Khalti checkout"} <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <p className="text-center font-body text-body-md text-light-on-surface-variant">You’ll finish your payment securely with Khalti.</p>
                </footer>
              </form>
            )}

            {panel === "auth" && (
              <div className="flex-1 overflow-y-auto p-gutter-lg">
                <p className="mb-1 font-label text-label-sm uppercase tracking-wider text-light-primary">{authMode === "login" ? "Good to see you again" : authMode === "forgot" ? "A fresh start" : "Good things start here"}</p>
                <h3 className="font-headline text-headline-md">{authMode === "login" ? "Your everyday, all in one place." : authMode === "forgot" ? "Let’s get you back in." : "Create your account."}</h3>
                <p className="mt-2 font-body text-body-md text-light-on-surface-variant">{authMode === "login" ? "Sign in to check out and follow your orders." : authMode === "forgot" ? "Enter the email you used to sign up and we’ll send you a reset link." : "Create your account to shop and keep track of your orders."}</p>
                <form onSubmit={handleAuth} className="mt-gutter-lg flex flex-col gap-gutter-md">
                  {authMode === "register" && (
                    <>
                      <Field label="Your name" name="name" autoComplete="name" required />
                      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" required />
                      <div className="grid grid-cols-2 gap-gutter-md">
                        <Field label="City" name="city" autoComplete="address-level2" required />
                        <Field label="Province" name="province" autoComplete="address-level1" required />
                      </div>
                      <Field label="Street address" name="street" autoComplete="street-address" />
                    </>
                  )}
                  <Field key={`email-${authMode}-${savedEmail}`} label="Email address" name="email" type="email" autoComplete="username" defaultValue={authMode === "login" || authMode === "forgot" ? savedEmail : ""} required />
                  {authMode !== "forgot" && <Field label="Password" name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} required />}
                  {authMode === "register" && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required />}
                  <button disabled={busy} className={`${primaryButton} mt-1 w-full px-gutter-lg py-3.5`}>
                    {busy ? "One moment..." : authMode === "login" ? "Sign in" : authMode === "forgot" ? "Send reset link" : "Create my account"}
                  </button>
                </form>
                {authMode === "login" && (
                  <button type="button" onClick={() => { setAuthMode("forgot"); setApiError(""); }} className="mt-gutter-md block font-body text-body-md text-light-on-surface-variant underline underline-offset-4 hover:text-light-primary">Forgot your password?</button>
                )}
                <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setApiError(""); }} className="mt-gutter-md w-full text-center font-body text-body-md text-light-on-surface-variant">
                  {authMode === "register" || authMode === "forgot" ? (authMode === "forgot" ? "Remembered it? " : "Already have an account? ") : "New around here? "}
                  <span className="font-label text-label-lg text-light-primary underline underline-offset-4">{authMode === "login" ? "Create an account" : "Sign in"}</span>
                </button>
                {apiError && <ErrorNote message={apiError} />}
              </div>
            )}

            {panel === "orders" && (
              <div className="flex-1 overflow-y-auto p-gutter-lg">
                {orders.length ? (
                  <div className="flex flex-col gap-gutter-md">
                    {orders.map((order) => (
                      <div key={order._id} className="rounded-md border border-light-outline-variant p-gutter-md">
                        <div className="flex items-center justify-between gap-gutter-sm">
                          <p className="font-title text-title-md">Order <span className="font-mono text-mono-md">{order.orderNumber?.slice(0, 8) || order._id}</span></p>
                          <span className="rounded-full bg-light-surface-container px-2.5 py-1 font-label text-label-sm uppercase">{order.status}</span>
                        </div>
                        <p className="mt-1 font-body text-body-md text-light-on-surface-variant">{new Date(order.createdAt).toLocaleDateString()} · {order.orderItems?.length || 0} items</p>
                        <p className="mt-1 font-mono text-mono-md tabular-nums">{formatPrice(order.totalPrice)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-section text-center font-body text-body-md text-light-on-surface-variant">No orders just yet. Your next good find is waiting.</div>
                )}
                {apiError && <ErrorNote message={apiError} />}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ErrorNote({ message }) {
  return (
    <p role="alert" className="mt-gutter-md rounded border border-light-error/30 bg-light-error-container px-3 py-2 font-body text-body-md text-light-error">{message}</p>
  );
}

function Field({ label, className = "", ...props }) {
  const inputClass = "h-11 w-full rounded border border-light-outline-variant bg-light-surface-container-lowest px-3 font-body text-body-md text-light-on-surface outline-none transition-colors duration-state-change focus:border-light-primary";
  return (
    <label className={`block font-label text-label-md text-light-on-surface-variant ${className}`}>
      {label}
      {props.type === "password" ? <PasswordInput {...props} className={inputClass} /> : <input {...props} className={`mt-1.5 ${inputClass}`} />}
    </label>
  );
}
