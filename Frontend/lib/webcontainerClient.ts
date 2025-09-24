"use client";

import { WebContainer } from "@webcontainer/api";
import { files } from "@/files";

// Keep globals on window to survive Fast Refresh and navigations
declare global {
  interface Window {
    __wc_instance__?: WebContainer;
    __wc_started__?: boolean;
    __wc_server_url__?: string;
    __wc_listeners__?: Set<(url: string) => void>;
  }
}

function getListeners() {
  if (!window.__wc_listeners__) window.__wc_listeners__ = new Set();
  return window.__wc_listeners__;
}

export function getLastPreviewUrl() {
  return window.__wc_server_url__;
}

export function onServerReadyOnce(cb: (url: string) => void) {
  const listeners = getListeners();
  listeners.add(cb);
  // return cleanup
  return () => listeners.delete(cb);
}

export async function ensureWebContainer() {
  if (typeof window === "undefined") return;

  if (window.__wc_instance__) {
    return window.__wc_instance__;
  }

  const wc = await WebContainer.boot();
  window.__wc_instance__ = wc;

  // Mount project once
  await wc.mount(files as any);

  // Attach server-ready listener once and fan-out to component listeners
  wc.on("server-ready", (port, hostOrUrl) => {
    const raw = String(hostOrUrl);
    const url = raw.includes("://") ? raw : `http://${raw}:${port}`;
    window.__wc_server_url__ = url;
    for (const fn of Array.from(getListeners())) {
      try { fn(url); } catch {}
    }
    getListeners().clear();
  });

  // Start only once per session
  if (!window.__wc_started__) {
    window.__wc_started__ = true;
    // Install deps and run dev
    const install = await wc.spawn("npm", ["install"]);
    await install.exit;
    await wc.spawn("npm", ["run", "dev"]);
  }

  return wc;
}


