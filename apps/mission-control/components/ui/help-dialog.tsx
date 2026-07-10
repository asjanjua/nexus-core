"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

type HelpDialogProps = {
  title: string;
  children: ReactNode;
  buttonLabel?: string;
  className?: string;
};

export function HelpDialog({
  title,
  children,
  buttonLabel,
  className = "",
}: HelpDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    okRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const fallback = triggerRef.current ?? previous;
      fallback?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={buttonLabel ?? `Explain ${title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={[
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-[10px] font-semibold leading-none text-white/55 transition hover:border-nexus-accent/50 hover:bg-nexus-accent/10 hover:text-nexus-accent focus:outline-none focus:ring-2 focus:ring-nexus-accent/60 focus:ring-offset-2 focus:ring-offset-nexus-bg",
          className,
        ].join(" ")}
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="w-full max-w-sm rounded-xl border border-white/15 bg-nexus-surface p-5 shadow-2xl shadow-black/50"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-base font-semibold text-nexus-text">
              {title}
            </h2>
            <div id={bodyId} className="mt-2 text-sm leading-6 text-nexus-muted">
              {children}
            </div>
            <div className="mt-5 flex justify-end">
              <button ref={okRef} type="button" className="btn-primary" onClick={() => setOpen(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function HelpLabel({
  children,
  title,
  help,
  className = "",
}: {
  children: ReactNode;
  title: string;
  help: ReactNode;
  className?: string;
}) {
  return (
    <span className={["inline-flex items-center gap-1.5", className].join(" ")}>
      <span>{children}</span>
      <HelpDialog title={title}>{help}</HelpDialog>
    </span>
  );
}
