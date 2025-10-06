"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WebContainerPreview from "@/components/WebContainerPreview";
import AppScreenshotPreview from "@/components/AppScreenshotPreview";
import { ensureWebContainer, saveAppVersion, getAllAppVersions, switchToAppVersion, getCurrentAppId, onAppVersionsChange, type AppVersion } from "@/lib/webcontainerClient";
import { Loader2, Maximize2 } from "lucide-react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogClose,
} from "@/components/motion-primitives/morphing-dialog";
import WebContainerLoadingPopup from "@/components/WebContainerLoadingPopup";
import { useWebContainerReady } from "@/components/WebContainerPreloader";
import AILoadingState from "@/components/kokonutui/ai-loading";
import AI_Input_Search from "@/components/kokonutui/ai-input-search";
import { ChatMessage, type Message } from "@/components/ui/chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content?: string;
  showPreview?: boolean;
  showLoading?: boolean;
  appId?: string;
  appName?: string;
  userPrompt?: string;
};

export default function ChatUI() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! Tell me what to build and I'll generate and run it below.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWebContainer, setShowWebContainer] = useState(false);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isWebContainerReady = useWebContainerReady();

  // Load app versions on mount
  useEffect(() => {
    const loadAppVersions = async () => {
      try {
        const versions = await getAllAppVersions();
        setAppVersions(versions);
        if (versions.length > 0) {
          setCurrentAppId(versions[0].id);
        }
      } catch (error) {
        console.error("Error loading app versions:", error);
      }
    };

    loadAppVersions();

    // Listen for app versions changes
    const unsubscribe = onAppVersionsChange(() => {
      // Reload app versions when they change
      loadAppVersions();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmit = useCallback(async (message?: string) => {
    const messageContent = message || "";
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      showLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/generate-app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_prompt: messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Save the app version
        const appId = await saveAppVersion(
          data.app_jsx_code,
          messageContent,
          `App ${Date.now()}`
        );

        // Update messages to show preview
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessage.id
              ? {
                  ...msg,
                  showLoading: false,
                        showPreview: true,
                        appId: appId,
                        appName: `App ${Date.now()}`,
                        userPrompt: messageContent,
                }
              : msg
          )
        );

        // Set as current app
        setCurrentAppId(appId);

        // Show loading popup and then WebContainer
        setShowLoadingPopup(true);
        setTimeout(() => {
          setShowLoadingPopup(false);
          setShowWebContainer(true);
        }, 2000);
      } else {
        throw new Error(data.message || "Failed to generate app");
      }
    } catch (error) {
      console.error("Error generating app:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                showLoading: false,
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);


  const handleExpandApp = useCallback(async (appId: string) => {
    try {
      await switchToAppVersion(appId);
      setCurrentAppId(appId);
      setShowWebContainer(true);
    } catch (error) {
      console.error("Error switching to app:", error);
    }
  }, []);

  const handleSwitchApp = useCallback(async (appId: string) => {
    try {
      await switchToAppVersion(appId);
      setCurrentAppId(appId);
      setShowWebContainer(true);
    } catch (error) {
      console.error("Error switching to app:", error);
    }
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 overflow-hidden min-w-0">

      {/* Messages container with ChatGPT-like styling */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={containerRef}
          className="px-4 max-w-4xl mx-auto"
          role="log"
          aria-live="polite"
        >
        {messages.map((m) => (
          <div key={m.id} className="w-full"> 
            {m.showLoading ? (
              <div className="w-full py-6">
                <div className="flex gap-4 items-start">
                  <div className="w-64 flex-shrink-0">
                    <div className="space-y-3">
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">Generating your app...</div>
                      <div className="h-[300px]">
                        <div className="w-full h-full overflow-hidden flex items-center justify-center">
                          <AILoadingState />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : m.showPreview ? (
              <div className="w-full py-6">
                <div className="space-y-4">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {m.appName || "App"} generated successfully
                    {m.userPrompt && (
                      <div className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">
                        "{m.userPrompt}"
                      </div>
                    )}
                  </div>
                  <div className="flex justify-start">
                    {m.appId ? (
                      <MorphingDialog>
                        <MorphingDialogTrigger>
                          <AppScreenshotPreview
                            appVersion={appVersions.find(v => v.id === m.appId) || {
                              id: m.appId,
                              name: m.appName || "App",
                              code: "",
                              timestamp: Date.now(),
                              userPrompt: m.userPrompt || ""
                            }}
                            isCurrentApp={currentAppId === m.appId}
                            onClick={() => handleExpandApp(m.appId!)}
                          />
                        </MorphingDialogTrigger>
                      
                      <MorphingDialogContainer>
                        <MorphingDialogContent className="w-full h-full max-w-6xl max-h-[90vh] bg-neutral-950 rounded-xl border border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
                          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
                            <MorphingDialogTitle className="text-xl font-medium text-white">
                              Live Preview
                            </MorphingDialogTitle>
                            <MorphingDialogClose className="!relative !top-0 !right-0 text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-lg" />
                          </div>
                          <div className="flex-1 bg-neutral-950">
                            {showWebContainer && <WebContainerPreview />}
                          </div>
                        </MorphingDialogContent>
                      </MorphingDialogContainer>
                    </MorphingDialog>
                    ) : (
                      <div className="w-64 h-64 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden flex items-center justify-center">
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">Loading preview...</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full py-6">
                <div className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%]", m.role === "user" ? "min-w-[200px]" : "")}>
                    <ChatMessage
                      id={m.id}
                      role={m.role}
                      content={m.content || ""}
                      createdAt={new Date()}
                      animation="scale"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      </ScrollArea>

      {/* AI Input Search Area */}
      <div className="bg-neutral-950 flex-shrink-0 p-4">
        <div className="max-w-4xl mx-auto">
          <AI_Input_Search 
            onMessageSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Loading Popup */}
      {showLoadingPopup && (
        <WebContainerLoadingPopup 
          isVisible={showLoadingPopup}
          onComplete={() => setShowLoadingPopup(false)}
        />
      )}
    </div>
  );
}