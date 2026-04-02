import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={[
        "w-full rounded border border-zinc-300 bg-white/60 px-3 py-1.5 text-sm text-zinc-900",
        "placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
        "dark:bg-black/10 dark:text-zinc-100 dark:border-zinc-800",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}

