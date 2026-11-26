"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, CircleAlert, Sprout } from "lucide-react";
import { apiRequest } from "../../lib/api";
import PasswordInput from "../components/PasswordInput";

export default function ResetPasswordPage() {
  const [reset, setReset] = useState({ token: "", userId: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReset({ token: query.get("token") || "", userId: query.get("userId") || "" });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      const result = await apiRequest(
        `/auth/reset-password?token=${encodeURIComponent(reset.token)}&userId=${encodeURIComponent(reset.userId)}`,
        {
          method: "POST",
          body: JSON.stringify({
            password: values.get("password"),
            confirmPassword: values.get("confirmPassword"),
          }),
        },
      );
      setComplete(true);
      setMessage(result.message || "Your password has been updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-c-paper px-5 py-10">
      <section className="w-full max-w-[440px] bg-c-card p-9 shadow-[0_20px_70px_rgba(22,29,24,0.10)]">
        <div className="flex items-center gap-2 text-[17px] font-black tracking-[-0.08em]">common<span className="-ml-2 text-c-brand">ground.</span><Sprout className="ml-auto text-c-brand" size={17} /></div>
        <div className="mt-9 text-[10px] font-bold uppercase tracking-[0.17em] text-c-brand">A fresh start</div>
        <h1 className="mt-2 text-[29px] tracking-[-0.06em]">{complete ? "You’re back in." : "Choose a new password."}</h1>
        {complete ? (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-[12px] text-c-brand"><Check size={16} /> {message}</div>
            <a href="/" className="mt-7 flex h-11 items-center justify-center gap-2 bg-c-ink text-[11px] font-semibold text-c-paper"><ArrowLeft size={14} /> Back to Common Ground</a>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[12px] leading-5 text-c-muted">Make it something secure and easy for you to remember.</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block text-[10px] text-c-muted">New password<PasswordInput required minLength={6} name="password" autoComplete="new-password" className="h-[42px] w-full border border-c-line bg-c-card px-3 text-[12px] text-c-ink outline-none focus:border-c-brand" /></label>
              <label className="block text-[10px] text-c-muted">Confirm new password<PasswordInput required minLength={6} name="confirmPassword" autoComplete="new-password" className="h-[42px] w-full border border-c-line bg-c-card px-3 text-[12px] text-c-ink outline-none focus:border-c-brand" /></label>
              <button disabled={busy || !reset.token || !reset.userId} className="mt-2 h-12 w-full bg-c-ink text-[11px] font-semibold text-c-paper hover:bg-c-brand">{busy ? "Updating password..." : "Update password"}</button>
            </form>
            {error && <p role="alert" className="mt-4 flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><CircleAlert className="mt-0.5 shrink-0" size={14} />{error}</p>}
            {!reset.token && <p className="mt-4 text-[11px] leading-5 text-c-danger">This reset link is incomplete. Request a new one from the sign-in screen.</p>}
          </>
        )}
      </section>
    </main>
  );
}
