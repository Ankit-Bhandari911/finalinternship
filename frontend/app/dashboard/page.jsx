"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  LogOut,
  PackagePlus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { apiRequest, formatPrice, imageFor } from "../../lib/api";

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

  useEffect(() => {
    if (!session.loading && isMerchant) loadProducts();
  }, [isMerchant, loadProducts, session.loading]);

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
  };

  return (
    <main className="min-h-screen bg-[#f7f7f3] text-[#1d211e]">
      <header className="border-b border-[#e7e8e1] bg-white">
        <div className="mx-auto flex h-[76px] w-[min(100%-40px,1240px)] items-center justify-between">
          <a href="/" className="text-[20px] font-black tracking-[-0.08em]">common<span className="text-[#315c45]">ground</span><span className="text-[#a4b64d]">.</span></a>
          <div className="flex items-center gap-5">
            {session.user && <span className="hidden text-[11px] text-[#73776f] sm:block">{session.user.name}</span>}
            {session.user && <button onClick={signOut} className="flex items-center gap-2 text-[11px] text-[#73776f] hover:text-[#1d211e]"><LogOut size={15} /> Sign out</button>}
            <a href="/" className="flex items-center gap-2 text-[11px] font-semibold"><ArrowLeft size={15} /> Back to shop</a>
          </div>
        </div>
      </header>

      <div className="mx-auto w-[min(100%-40px,1240px)] py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#315c45]">Seller space</div><h1 className="mt-2 text-[38px] font-medium tracking-[-0.065em] sm:text-[48px]">Your products<span className="text-[#315c45]">.</span></h1><p className="mt-2 text-[13px] text-[#73776f]">Add new finds to your store and keep your listings up to date.</p></div>
          {isMerchant && <button onClick={loadProducts} disabled={loadingProducts} className="flex h-10 items-center gap-2 border border-[#dfe1d9] bg-white px-4 text-[11px] font-semibold hover:border-[#315c45]"><RefreshCw size={14} className={loadingProducts ? "animate-spin" : ""} /> Refresh</button>}
        </div>

        {session.loading ? (
          <div className="mt-14 flex items-center gap-3 text-[13px] text-[#73776f]"><LoaderCircle className="animate-spin" size={17} /> Loading your account...</div>
        ) : !session.user ? (
          <section className="mt-10 max-w-[500px] border border-[#e7e8e1] bg-white p-6 sm:p-8">
            <h2 className="text-[20px] tracking-[-0.04em]">{mode === "register" ? "Create your seller account" : "Sign in to your seller account"}</h2>
            <p className="mt-2 text-[12px] leading-5 text-[#73776f]">Use your Common Ground account to manage its product listings.</p>
            <form onSubmit={signIn} className="mt-6 space-y-3">
              {mode === "register" && <>
                <label className="block text-[10px] text-[#72776f]">Store / your name<input required name="name" autoComplete="name" className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
                <label className="block text-[10px] text-[#72776f]">Phone number<input required name="phone" type="tel" autoComplete="tel" className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[10px] text-[#72776f]">City<input required name="city" className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
                  <label className="block text-[10px] text-[#72776f]">Province<input required name="province" className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
                </div>
                <label className="block text-[10px] text-[#72776f]">Street address<input name="street" className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
              </>}
              <label className="block text-[10px] text-[#72776f]">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
              <label className="block text-[10px] text-[#72776f]">Password<input required type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>
              {mode === "register" && <label className="block text-[10px] text-[#72776f]">Confirm password<input required name="confirmPassword" type="password" autoComplete="new-password" minLength={6} className="mt-1.5 h-[43px] w-full border border-[#e7e8e1] px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>}
              <button disabled={saving} className="h-11 w-full bg-[#1d211e] text-[11px] font-semibold text-white hover:bg-[#315c45]">{saving ? "One moment..." : mode === "register" ? "Create seller account" : "Sign in"}</button>
            </form>
            <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }} className="mt-4 block text-[11px] text-[#315c45] underline underline-offset-4">{mode === "register" ? "Already a seller? Sign in" : "New seller? Create an account"}</button>
          </section>
        ) : !isMerchant ? (
          <section className="mt-10 max-w-[620px] border border-[#eadfbd] bg-[#fffdf5] p-6 sm:p-8">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-[#9b7630]" size={19} /><div><h2 className="text-[18px] tracking-[-0.04em]">Merchant access is needed</h2><p className="mt-2 text-[12px] leading-5 text-[#6f6859]">You’re signed in as {session.user.email}, but this account does not have the <code className="rounded bg-[#f1ead8] px-1 py-0.5 text-[11px]">MERCHANT</code> role. Ask an administrator to grant seller access, then sign in again.</p><p className="mt-3 text-[11px] text-[#6f6859]">Your account ID: <code className="select-all">{session.user._id}</code></p></div></div>
          </section>
        ) : (
          <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(300px,0.72fr)_1.28fr]">
            <section className="border border-[#e7e8e1] bg-white p-6 sm:p-7">
              <div className="flex items-center gap-2"><PackagePlus size={17} className="text-[#315c45]" /><h2 className="text-[17px] font-medium tracking-tight">Add a product</h2></div>
              <p className="mt-2 text-[11px] leading-5 text-[#777c73]">Add the details and up to five photos. Product images are uploaded to your configured Cloudinary account.</p>
              <form onSubmit={addProduct} className="mt-5 space-y-3">
                <Field label="Product name" name="name" required />
                <div className="grid grid-cols-2 gap-3"><Field label="Brand" name="brand" /><Field label="Category" name="category" required /></div>
                <div className="grid grid-cols-2 gap-3"><Field label="Price (Rs.)" name="price" type="number" min="1" step="1" required /><Field label="Stock" name="stock" type="number" min="1" max="10000" defaultValue="1" /></div>
                <label className="block text-[10px] text-[#72776f]">Description (optional, AI writes one if left empty)<textarea name="description" rows="3" className="mt-1.5 w-full resize-y border border-[#e7e8e1] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#315c45]" /></label>
                <label className="flex min-h-[76px] cursor-pointer items-center gap-3 border border-dashed border-[#d7dacf] px-4 py-3 text-[11px] text-[#73776f] hover:border-[#315c45]"><ImagePlus size={19} className="shrink-0 text-[#315c45]" /><span>Choose product photos<span className="mt-1 block text-[9px] text-[#92968d]">JPEG, PNG or WebP · up to 5 images</span></span><input type="file" name="images" accept="image/*" multiple className="sr-only" /></label>
                <button disabled={saving} className="h-11 w-full bg-[#1d211e] text-[11px] font-semibold text-white hover:bg-[#315c45]">{saving ? "Uploading product..." : "Add to my store"}</button>
              </form>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-[17px] font-medium tracking-tight">Your listings <span className="text-[#858980]">({products.length})</span></h2><p className="mt-1 text-[11px] text-[#858980]">Only products created by your account appear here.</p></div></div>
              {loadingProducts && !products.length ? <div className="flex items-center gap-3 border border-[#e7e8e1] bg-white p-8 text-[12px] text-[#73776f]"><LoaderCircle className="animate-spin" size={16} /> Loading your listings...</div> : products.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => <article key={product._id} className="flex gap-4 border border-[#e7e8e1] bg-white p-3">
                    <img src={imageFor(product)} alt={product.name} className="h-[98px] w-[86px] shrink-0 bg-[#ecece6] object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col py-1">
                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#858980]">{product.category}</div>
                      <h3 className="mt-1 line-clamp-2 text-[13px] font-medium">{product.name}</h3>
                      <div className="mt-1 text-[11px]">{formatPrice(product.price)} <span className="text-[#858980]">· stock {product.stock ?? 1}</span></div>
                      <button onClick={() => deleteProduct(product)} className="mt-auto flex w-fit items-center gap-1.5 pt-2 text-[10px] font-semibold text-[#9a4f45] hover:text-[#6f3029]"><Trash2 size={13} /> Delete product</button>
                    </div>
                  </article>)}
                </div>
              ) : (
                <div className="border border-dashed border-[#d7dacf] bg-white px-6 py-12 text-center"><PackagePlus className="mx-auto text-[#8b9286]" size={25} /><div className="mt-3 text-[14px]">Your store is ready for its first product.</div><p className="mt-1 text-[11px] text-[#858980]">Add a product using the form.</p></div>
              )}
            </section>
          </div>
        )}

        {(error || notice) && <div role={error ? "alert" : "status"} className={`mt-6 border px-4 py-3 text-[12px] leading-5 ${error ? "border-red-200 bg-red-50 text-red-800" : "border-[#d8e6d3] bg-[#f0f6ed] text-[#315c45]"}`}>{error || notice}</div>}
      </div>
    </main>
  );
}

function Field({ label, ...props }) {
  return <label className="block text-[10px] text-[#72776f]">{label}<input {...props} className="mt-1.5 h-[42px] w-full border border-[#e7e8e1] bg-white px-3 text-[12px] outline-none focus:border-[#315c45]" /></label>;
}
