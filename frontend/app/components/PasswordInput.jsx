"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function PasswordInput({ className = "", wrapperClassName = "mt-1.5", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={`relative block ${wrapperClassName}`}>
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#72776f] hover:text-[#1d211e]"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}
