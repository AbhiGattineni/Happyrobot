import * as React from "react";

type ButtonVariant = "primary" | "secondary";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({
  variant = "primary",
  className,
  type,
  ...props
}: Props) {
  const variantClass =
    variant === "primary"
      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
      : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 dark:bg-black/10 dark:text-zinc-100 dark:border-zinc-800";

  return (
    <button
      type={type ?? "button"}
      className={[
        "inline-flex items-center justify-center rounded border px-3 py-1.5 text-sm font-medium",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40",
        variantClass,
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}

