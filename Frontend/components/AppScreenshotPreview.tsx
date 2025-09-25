"use client";

import React, { useState } from "react";
import { Maximize2, Camera, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppVersion, captureScreenshotForApp, createTestScreenshot } from "@/lib/webcontainerClient";

interface AppScreenshotPreviewProps {
  appVersion: AppVersion;
  isCurrentApp?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function AppScreenshotPreview({ 
  appVersion, 
  isCurrentApp = false, 
  onClick,
  className 
}: AppScreenshotPreviewProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureScreenshot = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    setIsCapturing(true);
    try {
      // First try to capture from WebContainer
      const success = await captureScreenshotForApp(appVersion.id);
      
      // If that fails, create a test screenshot for debugging
      if (!success) {
        console.log('WebContainer capture failed, creating test screenshot...');
        const testScreenshot = createTestScreenshot();
        
        // Update the app version with test screenshot
        const versions = (window as any).__wc_app_versions__;
        if (versions) {
          const version = versions.get(appVersion.id);
          if (version) {
            version.screenshot = testScreenshot;
            versions.set(appVersion.id, version);
            // Trigger update
            const listeners = (window as any).__wc_version_listeners__;
            if (listeners) {
              for (const fn of Array.from(listeners)) {
                try { fn(); } catch {}
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div 
      className={cn(
        "relative w-full h-[400px] rounded-lg border bg-card text-card-foreground overflow-hidden cursor-pointer group",
        isCurrentApp && "ring-2 ring-primary",
        className
      )}
      onClick={onClick}
    >
      {appVersion.screenshot ? (
        <img
          src={appVersion.screenshot}
          alt={`${appVersion.name} preview`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center">
            <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground mb-2">No preview available</div>
            <div
              onClick={handleCaptureScreenshot}
              className={cn(
                "text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 mx-auto transition-colors",
                isCapturing && "opacity-50 cursor-not-allowed"
              )}
            >
              {isCapturing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3" />
                  Capture Screenshot
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay with app info */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="text-white text-sm font-medium truncate">
            {appVersion.name}
          </div>
          <div className="text-white/70 text-xs truncate">
            {appVersion.userPrompt}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
          {!appVersion.screenshot && (
            <div
              onClick={handleCaptureScreenshot}
              className={cn(
                "h-8 w-8 rounded-md bg-secondary/90 hover:bg-secondary flex items-center justify-center cursor-pointer shadow-sm transition-colors",
                isCapturing && "opacity-50 cursor-not-allowed"
              )}
              title="Capture Screenshot"
            >
              {isCapturing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </div>
          )}
          <div className="h-8 w-8 rounded-md bg-secondary/90 hover:bg-secondary flex items-center justify-center cursor-pointer shadow-sm">
            <Maximize2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
