"use client";

import React from "react";
import { Maximize2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppVersion } from "@/lib/webcontainerClient";

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
  return (
    <div 
      className={cn(
        "relative w-64 h-64 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200",
        isCurrentApp && "ring-2 ring-blue-500",
        className
      )}
      onClick={onClick}
    >
      {/* Square image placeholder */}
      <div className="w-full h-40 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Smartphone className="w-12 h-12 text-neutral-400 dark:text-neutral-600" />
      </div>
      
      {/* App info section */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
            {appVersion.name}
          </h3>
          <Maximize2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {appVersion.userPrompt}
        </p>
        <div className="text-xs text-neutral-500 dark:text-neutral-500">
          {new Date(appVersion.timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}