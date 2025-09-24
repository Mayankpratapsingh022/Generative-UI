"use client";

import React, { useEffect, useState } from "react";
import { ensureWebContainer } from "@/lib/webcontainerClient";

export default function WebContainerPreloader() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const preloadWebContainer = async () => {
      try {
        console.log("🚀 Pre-loading WebContainer...");
        await ensureWebContainer();
        
        if (isMounted) {
          setIsReady(true);
          console.log("✅ WebContainer pre-loaded successfully");
        }
      } catch (err) {
        console.error("❌ Failed to pre-load WebContainer:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load WebContainer");
        }
      }
    };

    // Start pre-loading immediately when component mounts
    preloadWebContainer();

    return () => {
      isMounted = false;
    };
  }, []);

  // This component doesn't render anything visible
  // It just pre-loads the WebContainer in the background
  return null;
}

// Export a hook to check if WebContainer is ready
export function useWebContainerReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      const wcInstance = (window as any).__wc_instance__;
      const serverUrl = (window as any).__wc_server_url__;
      setIsReady(!!wcInstance && !!serverUrl);
    };

    // Check immediately
    checkReady();

    // Check periodically until ready
    const interval = setInterval(checkReady, 500);

    return () => clearInterval(interval);
  }, []);

  return isReady;
}
