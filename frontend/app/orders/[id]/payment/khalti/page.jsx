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
    const status = new URLSearchParams(window.location.search).get("status") || "unknown";
    const token = window.localStorage.getItem("cg-token");
    if (!token) {
      setState({ status: "error", message: "Sign in again to confirm your payment." });
      return;
    }

    apiRequest(`/orders/${id}/confirm-payment`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status }),
    }).then(() => {
      setState({ status: "success", message: "Your order is confirmed. Thank you for shopping with us." });
    }).catch((error) => {
      setState({ status: "error", message: error.message });
    });
  }, [id]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f3] px-5">
      <section className="w-full max-w-[440px] bg-white p-9 text-center shadow-[0_20px_70px_rgba(22,29,24,0.10)]">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${state.status === "success" ? "bg-[#e6eedf] text-[#315c45]" : state.status === "error" ? "bg-red-50 text-red-700" : "bg-[#f0f1ec] text-[#315c45]"}`}>
          {state.status === "loading" ? <LoaderCircle className="animate-spin" size={21} /> : state.status === "success" ? <Check size={23} /> : <CircleAlert size={21} />}
        </div>
        <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-[#315c45]">Common Ground</div>
        <h1 className="mt-2 text-[27px] tracking-[-0.06em]">{state.status === "success" ? "That’s a good choice." : state.status === "error" ? "Payment needs attention." : "One moment..."}</h1>
        <p role={state.status === "error" ? "alert" : "status"} className="mt-3 text-[12px] leading-5 text-[#777c73]">{state.message}</p>
        {state.status !== "loading" && <a href="/" className="mt-7 inline-flex h-11 items-center gap-2 bg-[#1d211e] px-5 text-[11px] font-semibold text-white"><ArrowLeft size={14} /> Back to Common Ground</a>}
      </section>
    </main>
  );
}
