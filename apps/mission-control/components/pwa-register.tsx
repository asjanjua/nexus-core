"use client";

import { useEffect } from "react";

/**
 * Registers the Phase 0 PWA service worker (public/sw.js) once on mount.
 * Renders nothing. Safe to include in every layout branch — registration
 * is idempotent and only runs in the browser when SW is supported.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failure must never break the app; PWA is progressive.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
