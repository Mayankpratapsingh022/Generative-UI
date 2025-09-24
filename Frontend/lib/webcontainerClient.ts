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

export async function writeFileInWebContainer(path: string, contents: string) {
  const wc = await ensureWebContainer();
  // ensureWebContainer may return void on server; guard in client
  // @ts-expect-error runtime guard
  if (!wc) return;
  // @ts-expect-error wc exists on client
  await wc.fs.writeFile(path, contents);
}

export async function updateAppTsx(appCode: string) {
  // Some responses may come fenced like ```jsx ... ```; strip fences
  const cleaned = stripMarkdownFences(appCode);
  await writeFileInWebContainer("/src/App.tsx", cleaned);
}

function stripMarkdownFences(code: string) {
  const fenceMatch = code.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim() + "\n";
  return code;
}


