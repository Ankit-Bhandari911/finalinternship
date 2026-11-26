"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { apiRequest } from "../../../../../lib/api";

export default function KhaltiPaymentResult() {
  const { id } = useParams();
  const [state, setState] = useState({ status: "loading", message: "Confirming your payment..." });

  useEffect(() => {
    if (!id) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status") || "unknown";
    const pidx = params.get("pidx") || undefined;
    const token = window.localStorage.getItem("cg-token");
    if (!token) {
      setState({ status: "error", message: "Sign in again to confirm your payment." });
      return;
    }

    apiRequest(`/orders/${id}/confirm-payment`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status, pidx }),
    }).then(() => {
      setState({ status: "success", message: "Your order is confirmed. Thank you for shopping with us." });
    }).catch((error) => {
      setState({ status: "error", message: error.message });
    });
  }, [id]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-c-paper px-5">
      <section className="w-full max-w-[440px] bg-c-card p-9 text-center shadow-[0_20px_70px_rgba(22,29,24,0.10)]">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${state.status === "success" ? "bg-c-soft text-c-brand" : state.status === "error" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-c-soft text-c-brand"}`}>
          {state.status === "loading" ? <LoaderCircle className="animate-spin" size={21} /> : state.status === "success" ? <Check size={23} /> : <CircleAlert size={21} />}
        </div>
        <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-c-brand">Common Ground</div>
        <h1 className="mt-2 text-[27px] tracking-[-0.06em]">{state.status === "success" ? "That’s a good choice." : state.status === "error" ? "Payment needs attention." : "One moment..."}</h1>
        <p role={state.status === "error" ? "alert" : "status"} className="mt-3 text-[12px] leading-5 text-c-muted">{state.message}</p>
        {state.status !== "loading" && <a href="/" className="mt-7 inline-flex h-11 items-center gap-2 bg-c-ink px-5 text-[11px] font-semibold text-c-paper"><ArrowLeft size={14} /> Back to Common Ground</a>}
      </section>
    </main>
  );
}
