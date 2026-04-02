"use client";

import * as React from "react";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export default function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
  menuClassName,
}: {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={["relative", className ?? ""].join(" ")}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={[
          "w-full rounded border px-3 py-1.5 text-sm text-left outline-none",
          "bg-white/60 text-zinc-900 border-zinc-300 hover:bg-white",
          "dark:bg-black/10 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-black/20",
          disabled
            ? "cursor-not-allowed opacity-60 hover:bg-white/60 dark:hover:bg-black/10"
            : "",
        ].join(" ")}
      >
        <span>{selected?.label ?? ""}</span>
        <span className="float-right select-none text-zinc-500">▾</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className={[
            "absolute z-20 mt-1 w-full overflow-hidden rounded border shadow-sm",
            "border-zinc-200 bg-white text-zinc-900",
            "dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-100",
            menuClassName ?? "",
          ].join(" ")}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={[
                  "block w-full px-3 py-2 text-sm text-left",
                  active ? "bg-blue-600 text-white" : "",
                  active ? "" : "hover:bg-zinc-100 dark:hover:bg-white/10",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

