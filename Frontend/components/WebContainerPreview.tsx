"use client";

import React from "react";
import { ensureWebContainer, onServerReadyOnce, getLastPreviewUrl } from "@/lib/webcontainerClient";
import { useTheme } from "./theme-provider";

export default function WebContainerPreview() {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = React.useState<string>("Starting…");
  const { theme } = useTheme();

  // Resolve system theme to a concrete value
  const resolvedTheme = React.useMemo<"light" | "dark">(() => {
    if (theme === "system") {
      const isDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return isDark ? "dark" : "light";
    }
    return theme === "dark" ? "dark" : "light";
  }, [theme]);

  React.useEffect(() => {
    let removeListener: (() => void) | null = null;

    async function start() {
      try {
        setStatus("Booting container and starting dev server…");
        await ensureWebContainer();

        // If a URL already exists from a previous mount (HMR/navigation), use it immediately
        const existing = getLastPreviewUrl();
        if (existing && iframeRef.current) {
          iframeRef.current.src = existing;
          setStatus("Running");
        }

        // Also subscribe for the next server-ready event (first start case)
        removeListener = onServerReadyOnce((url) => {
          if (iframeRef.current) iframeRef.current.src = url;
          setStatus("Running");
          // Send theme once we have a URL and the iframe navigates
          setTimeout(() => {
            try {
              iframeRef.current?.contentWindow?.postMessage({ type: "THEME", theme: resolvedTheme }, "*");
            } catch {}
          }, 100);
        });
      } catch (e: any) {
        setStatus(`Error: ${e?.message || String(e)}`);
      }
    }

    start();
    return () => {
      removeListener?.();
    };
  }, []);

  // Re-send theme to iframe whenever it changes
  React.useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "THEME", theme: resolvedTheme }, "*");
    } catch {}
  }, [resolvedTheme]);

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-muted-foreground">{status}</div>
      <iframe
        ref={iframeRef}
        title="WebContainer Preview"
        className="w-full h-[600px] rounded border"
        style={{ background: "white" }}
        onLoad={() => {
          try {
            iframeRef.current?.contentWindow?.postMessage({ type: "THEME", theme: resolvedTheme }, "*");
          } catch {}
        }}
      />
    </div>
  );
}


