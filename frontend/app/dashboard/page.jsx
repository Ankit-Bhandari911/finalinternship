"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ImagePlus,
  LoaderCircle,
  LogOut,
  PackagePlus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { apiRequest, formatPrice, imageFor } from "../../lib/api";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";

export default function MerchantDashboard() {
  const [session, setSession] = useState({ loading: true, user: null, token: "" });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    try {
      const user = window.localStorage.getItem("cg-user");
      const token = window.localStorage.getItem("cg-token");
      setSession({
        loading: false,
        user: user && token ? JSON.parse(user) : null,
        token: user && token ? token : "",
      });
    } catch {
      window.localStorage.removeItem("cg-user");
      window.localStorage.removeItem("cg-token");
      setSession({ loading: false, user: null, token: "" });
    }
  }, []);

  const isMerchant = session.user?.roles?.includes("MERCHANT");

  const loadProducts = useCallback(async () => {
    if (!session.user?._id || !session.token) return;
    setLoadingProducts(true);
    setError("");
    try {
      const result = await apiRequest(
        `/products?createdBy=${encodeURIComponent(session.user._id)}`,
        { token: session.token },
      );
      if (!Array.isArray(result)) {
        throw new Error("The products API returned an unexpected response.");
      }
      setProducts(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingProducts(false);
    }
  }, [session.token, session.user?._id]);

  const loadSummary = useCallback(async () => {
    if (!session.token) return;
    setLoadingSummary(true);
    try {
      setSummary(await apiRequest("/orders/merchant/summary", { token: session.token }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingSummary(false);
    }
  }, [session.token]);

  useEffect(() => {
    if (!session.loading && isMerchant) {
      loadProducts();
      loadSummary();
    }
  }, [isMerchant, loadProducts, loadSummary, session.loading]);

  const signIn = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let body = { email, password };
      if (mode === "register") {
        const v = Object.fromEntries(new FormData(event.currentTarget).entries());
        body = {
          name: v.name,
          email,
          password,
          confirmPassword: v.confirmPassword,
          phone: v.phone,
          asMerchant: true,
          address: { city: v.city, province: v.province, street: v.street, country: "Nepal" },
        };
      }
      const result = await apiRequest(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!result.authToken) throw new Error("The API did not return an authentication token.");
      const { authToken, ...user } = result;
      window.localStorage.setItem("cg-user", JSON.stringify(user));
      window.localStorage.setItem("cg-token", authToken);
      setSession({ loading: false, user, token: authToken });
      setPassword("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const addProduct = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const images = formData.getAll("images").filter((file) => file.size > 0);
    if (images.length > 5) {
      setError("Choose up to five product photos.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/products", {
        method: "POST",
        token: session.token,
        body: formData,
      });
      form.reset();
      setNotice("Product added to your store.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete “${product.name}” from your store?`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/products/${product._id}`, {
        method: "DELETE",
        token: session.token,
      });
      setProducts((current) => current.filter((item) => item._id !== product._id));
      setNotice("Product deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const signOut = async () => {
    window.localStorage.removeItem("cg-user");
    window.localStorage.removeItem("cg-token");
    setSession({ loading: false, user: null, token: "" });
    setProducts([]);
    setSummary(null);
  };

  return (
    <main className="min-h-screen bg-c-paper text-c-ink">
      <header className="border-b border-c-line bg-c-card">
        <div className="mx-auto flex h-[76px] w-[min(100%-40px,1240px)] items-center justify-between">
          <a href="/" className="text-[20px] font-black tracking-[-0.08em]">common<span className="text-c-brand">ground</span><span className="text-[#a4b64d]">.</span></a>
          <div className="flex items-center gap-5">
            <ThemeToggle className="text-c-muted hover:text-c-ink [&>svg]:h-[17px] [&>svg]:w-[17px]" />
            {session.user && <span className="hidden text-[11px] text-c-muted sm:block">{session.user.name}</span>}
            {session.user && <button onClick={signOut} className="flex items-center gap-2 text-[11px] text-c-muted hover:text-c-ink"><LogOut size={15} /> Sign out</button>}
            <a href="/" className="flex items-center gap-2 text-[11px] font-semibold"><ArrowLeft size={15} /> Back to shop</a>
          </div>
        </div>
      </header>

      <div className="mx-auto w-[min(100%-40px,1240px)] py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.17em] text-c-brand">Seller space</div><h1 className="mt-2 text-[38px] font-medium tracking-[-0.065em] sm:text-[48px]">Your products<span className="text-c-brand">.</span></h1><p className="mt-2 text-[13px] text-c-muted">Add new finds to your store and keep your listings up to date.</p></div>
          {isMerchant && <button onClick={() => { loadProducts(); loadSummary(); }} disabled={loadingProducts || loadingSummary} className="flex h-10 items-center gap-2 border border-c-line2 bg-c-card px-4 text-[11px] font-semibold hover:border-c-brand"><RefreshCw size={14} className={loadingProducts || loadingSummary ? "animate-spin" : ""} /> Refresh</button>}
        </div>

        {session.loading ? (
          <div className="mt-14 flex items-center gap-3 text-[13px] text-c-muted"><LoaderCircle className="animate-spin" size={17} /> Loading your account...</div>
        ) : !session.user ? (
          <section className="mt-10 max-w-[500px] border border-c-line bg-c-card p-6 sm:p-8">
            <h2 className="text-[20px] tracking-[-0.04em]">{mode === "register" ? "Create your seller account" : "Sign in to your seller account"}</h2>
            <p className="mt-2 text-[12px] leading-5 text-c-muted">Use your Common Ground account to manage its product listings.</p>
            <form onSubmit={signIn} className="mt-6 space-y-3">
              {mode === "register" && <>
                <label className="block text-[10px] text-c-muted">Store / your name<input required name="name" autoComplete="name" className="mt-1.5 h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
                <label className="block text-[10px] text-c-muted">Phone number<input required name="phone" type="tel" autoComplete="tel" className="mt-1.5 h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[10px] text-c-muted">City<input required name="city" className="mt-1.5 h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
                  <label className="block text-[10px] text-c-muted">Province<input required name="province" className="mt-1.5 h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
                </div>
                <label className="block text-[10px] text-c-muted">Street address<input name="street" className="mt-1.5 h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
              </>}
              <label className="block text-[10px] text-c-muted">Email address<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
              <label className="block text-[10px] text-c-muted">Password<PasswordInput required autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>
              {mode === "register" && <label className="block text-[10px] text-c-muted">Confirm password<PasswordInput required name="confirmPassword" autoComplete="new-password" minLength={6} className="h-[43px] w-full border border-c-line px-3 text-[12px] outline-none focus:border-c-brand" /></label>}
              <button disabled={saving} className="h-11 w-full bg-c-ink text-[11px] font-semibold text-c-paper hover:bg-c-brand">{saving ? "One moment..." : mode === "register" ? "Create seller account" : "Sign in"}</button>
            </form>
            <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }} className="mt-4 block text-[11px] text-c-brand underline underline-offset-4">{mode === "register" ? "Already a seller? Sign in" : "New seller? Create an account"}</button>
          </section>
        ) : !isMerchant ? (
          <section className="mt-10 max-w-[620px] border border-c-line2 bg-c-soft p-6 sm:p-8">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-[#9b7630]" size={19} /><div><h2 className="text-[18px] tracking-[-0.04em]">Merchant access is needed</h2><p className="mt-2 text-[12px] leading-5 text-c-muted">You’re signed in as {session.user.email}, but this account does not have the <code className="rounded bg-c-soft px-1 py-0.5 text-[11px]">MERCHANT</code> role. Ask an administrator to grant seller access, then sign in again.</p><p className="mt-3 text-[11px] text-c-muted">Your account ID: <code className="select-all">{session.user._id}</code></p></div></div>
          </section>
        ) : (
          <>
          <SalesSummary summary={summary} loading={loadingSummary} />
          <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(300px,0.72fr)_1.28fr]">
            <section className="border border-c-line bg-c-card p-6 sm:p-7">
              <div className="flex items-center gap-2"><PackagePlus size={17} className="text-c-brand" /><h2 className="text-[17px] font-medium tracking-tight">Add a product</h2></div>
              <p className="mt-2 text-[11px] leading-5 text-c-muted">Add the details and up to five photos. Product images are uploaded to your configured Cloudinary account.</p>
              <form onSubmit={addProduct} className="mt-5 space-y-3">
                <Field label="Product name" name="name" required />
                <div className="grid grid-cols-2 gap-3"><Field label="Brand" name="brand" /><Field label="Category" name="category" required /></div>
                <div className="grid grid-cols-2 gap-3"><Field label="Price (Rs.)" name="price" type="number" min="1" step="1" required /><Field label="Stock" name="stock" type="number" min="1" max="10000" defaultValue="1" /></div>
                <label className="block text-[10px] text-c-muted">Description (optional, AI writes one if left empty)<textarea name="description" rows="3" className="mt-1.5 w-full resize-y border border-c-line bg-c-card px-3 py-2.5 text-[12px] outline-none focus:border-c-brand" /></label>
                <label className="flex min-h-[76px] cursor-pointer items-center gap-3 border border-dashed border-c-line2 px-4 py-3 text-[11px] text-c-muted hover:border-c-brand"><ImagePlus size={19} className="shrink-0 text-c-brand" /><span>Choose product photos<span className="mt-1 block text-[9px] text-c-muted">JPEG, PNG or WebP · up to 5 images</span></span><input type="file" name="images" accept="image/*" multiple className="sr-only" /></label>
                <button disabled={saving} className="h-11 w-full bg-c-ink text-[11px] font-semibold text-c-paper hover:bg-c-brand">{saving ? "Uploading product..." : "Add to my store"}</button>
              </form>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-[17px] font-medium tracking-tight">Your listings <span className="text-c-muted">({products.length})</span></h2><p className="mt-1 text-[11px] text-c-muted">Only products created by your account appear here.</p></div></div>
              {loadingProducts && !products.length ? <div className="flex items-center gap-3 border border-c-line bg-c-card p-8 text-[12px] text-c-muted"><LoaderCircle className="animate-spin" size={16} /> Loading your listings...</div> : products.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => <article key={product._id} className="flex gap-4 border border-c-line bg-c-card p-3">
                    <img src={imageFor(product)} alt={product.name} className="h-[98px] w-[86px] shrink-0 bg-c-soft object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col py-1">
                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-c-muted">{product.category}</div>
                      <h3 className="mt-1 line-clamp-2 text-[13px] font-medium">{product.name}</h3>
                      <div className="mt-1 text-[11px]">{formatPrice(product.price)} <span className="text-c-muted">· stock {product.stock ?? 1}</span></div>
                      <button onClick={() => deleteProduct(product)} className="mt-auto flex w-fit items-center gap-1.5 pt-2 text-[10px] font-semibold text-c-danger hover:text-c-danger"><Trash2 size={13} /> Delete product</button>
                    </div>
                  </article>)}
                </div>
              ) : (
                <div className="border border-dashed border-c-line2 bg-c-card px-6 py-12 text-center"><PackagePlus className="mx-auto text-c-muted" size={25} /><div className="mt-3 text-[14px]">Your store is ready for its first product.</div><p className="mt-1 text-[11px] text-c-muted">Add a product using the form.</p></div>
              )}
            </section>
          </div>
          </>
        )}

        {(error || notice) && <div role={error ? "alert" : "status"} className={`mt-6 border px-4 py-3 text-[12px] leading-5 ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" : "border-c-line2 bg-c-soft text-c-brand"}`}>{error || notice}</div>}
      </div>
    </main>
  );
}

function Field({ label, ...props }) {
  return <label className="block text-[10px] text-c-muted">{label}<input {...props} className="mt-1.5 h-[42px] w-full border border-c-line bg-c-card px-3 text-[12px] outline-none focus:border-c-brand" /></label>;
}

function SalesSummary({ summary, loading }) {
  if (!summary) {
    return (
      <section className="mt-9 flex items-center gap-3 border border-c-line bg-c-card p-6 text-[12px] text-c-muted">
        {loading ? <><LoaderCircle className="animate-spin" size={16} /> Loading sales summary...</> : "Sales summary is not available yet."}
      </section>
    );
  }

  const maxDaily = Math.max(...summary.daily.map((day) => day.revenue), 1);
  const last30 = summary.daily.reduce((total, day) => total + day.revenue, 0);
  const stats = [
    ["Revenue", formatPrice(summary.totalRevenue)],
    ["Paid orders", summary.totalOrders],
    ["Items sold", summary.unitsSold],
    ["Avg. order", formatPrice(Math.round(summary.averageOrderValue))],
  ];

  return (
    <section className="mt-9 border border-c-line bg-c-card p-6 sm:p-7">
      <div className="flex items-center gap-2"><BarChart3 size={17} className="text-c-brand" /><h2 className="text-[17px] font-medium tracking-tight">Sales summary</h2></div>
      <p className="mt-1 text-[11px] text-c-muted">Counts paid orders only (confirmed, shipped or delivered). Revenue uses each product&apos;s current price.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="border border-c-line bg-c-paper px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-c-muted">{label}</div>
            <div className="mt-1 text-[20px] font-medium tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex items-baseline justify-between"><h3 className="text-[13px] font-medium">Last 30 days</h3><span className="text-[11px] text-c-muted">{formatPrice(last30)}</span></div>
          <div className="mt-3 flex h-[120px] items-end gap-[3px]" role="img" aria-label="Daily revenue for the last 30 days">
            {summary.daily.map((day) => (
              <div key={day.date} title={`${day.date}: ${formatPrice(day.revenue)}`} className="flex h-full flex-1 items-end">
                <div className={`w-full ${day.revenue ? "bg-c-brand" : "bg-c-line"}`} style={{ height: day.revenue ? `${Math.max((day.revenue / maxDaily) * 100, 4)}%` : "2px" }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-c-muted"><span>{summary.daily[0]?.date}</span><span>{summary.daily[summary.daily.length - 1]?.date}</span></div>
        </div>

        <div>
          <h3 className="text-[13px] font-medium">Top products</h3>
          {summary.topProducts.length ? (
            <ol className="mt-3 space-y-2">
              {summary.topProducts.map((product, index) => (
                <li key={product._id} className="flex items-center gap-3">
                  <span className="w-4 text-[11px] text-c-muted">{index + 1}</span>
                  <img src={imageFor(product)} alt="" className="h-9 w-9 shrink-0 bg-c-soft object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{product.name}</div>
                    <div className="text-[10px] text-c-muted">{product.units} sold</div>
                  </div>
                  <div className="text-[12px]">{formatPrice(product.revenue)}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-[12px] text-c-muted">No paid orders for your products yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
