"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { TurnstileAction } from "@/lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type TurnstileHandle = {
  /** Get a fresh token. Call after every submit — tokens are single-use. */
  reset: () => void;
};

type Props = {
  /** Must match the action the API route verifies. */
  action: TurnstileAction;
  onToken: (token: string) => void;
};

/**
 * Cloudflare Turnstile widget. Renders nothing when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (local development).
 */
export const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile({ action, onToken }, handle) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // The script may already be loaded from a previous page (client navigation).
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.turnstile);

  useImperativeHandle(
    handle,
    () => ({
      reset: () => {
        onToken("");
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }),
    [onToken],
  );

  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      action,
      callback: (t: string) => onToken(t),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [ready, action, onToken]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={ref} className="flex justify-center" />
    </>
  );
});

export const turnstileEnabled = !!SITE_KEY;
