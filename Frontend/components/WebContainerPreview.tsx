"use client";

import React from "react";
import { ensureWebContainer, onServerReadyOnce, getLastPreviewUrl } from "@/lib/webcontainerClient";

export default function WebContainerPreview() {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = React.useState<string>("Starting…");

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

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-muted-foreground">{status}</div>
      <iframe
        ref={iframeRef}
        title="WebContainer Preview"
        className="w-full h-[600px] rounded border"
        style={{ background: "white" }}
      />
    </div>
  );
}


