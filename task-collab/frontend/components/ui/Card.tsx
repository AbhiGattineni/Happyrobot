import * as React from "react";

type Props = React.HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: Props) {
  return (
    <div
      className={[
        "rounded border border-zinc-200 bg-white/60 p-4 shadow-sm",
        "dark:bg-black/20 dark:border-zinc-800",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}

