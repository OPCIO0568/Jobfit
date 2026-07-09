import type { ReactNode } from "react";

type StatusNoticeProps = {
  variant: "info" | "success" | "error";
  title?: string;
  message: string;
  children?: ReactNode;
};

const variantClassNames = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-700",
};

export function StatusNotice({
  variant,
  title,
  message,
  children,
}: StatusNoticeProps) {
  return (
    <div
      className={`mt-5 rounded-md border px-4 py-3 text-sm ${variantClassNames[variant]}`}
      role={variant === "error" ? "alert" : "status"}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <p className={title ? "mt-1 leading-6" : "font-semibold"}>{message}</p>
      {children}
    </div>
  );
}
