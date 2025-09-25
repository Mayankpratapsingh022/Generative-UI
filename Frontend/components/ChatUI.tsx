"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WebContainerPreview from "@/components/WebContainerPreview";
import AppScreenshotPreview from "@/components/AppScreenshotPreview";
import { ensureWebContainer, saveAppVersion, getAllAppVersions, switchToAppVersion, getCurrentAppId, onAppVersionsChange, type AppVersion } from "@/lib/webcontainerClient";
import { Loader2, Maximize2, ChevronDown } from "lucide-react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogClose,
} from "@/components/motion-primitives/morphing-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WebContainerLoadingPopup from "@/components/WebContainerLoadingPopup";
import { useWebContainerReady } from "@/components/WebContainerPreloader";
import AILoadingState from "@/components/kokonutui/ai-loading";

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
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [showWebContainer, setShowWebContainer] = useState(false);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [currentAppId, setCurrentAppId] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const isWebContainerReady = useWebContainerReady();

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load existing app versions on mount and listen for changes
  useEffect(() => {
    const versions = getAllAppVersions();
    setAppVersions(versions);
    setCurrentAppId(getCurrentAppId());

    // Listen for version changes (e.g., when screenshots are captured)
    const removeListener = onAppVersionsChange(() => {
      const updatedVersions = getAllAppVersions();
      setAppVersions(updatedVersions);
    });

    return () => {
      removeListener();
    };
  }, []);

  const callGenerateAppAPI = useCallback(async (userPrompt: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_prompt: userPrompt }),
      });
      const result = await response.json();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const userPrompt = value.trim();
    if (!userPrompt || isLoading) return;
    setValue("");

    // Add user message on the right
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: userPrompt },
    ]);

    // Add loading message first
    const loadingMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMessageId,
        role: "assistant",
        showLoading: true,
      },
    ]);

    // Show loading popup only if WebContainer is not ready yet
    if (!isWebContainerReady) {
      setShowLoadingPopup(true);
    }

    try {
      const result = await callGenerateAppAPI(userPrompt);
      if (result?.app_jsx_code) {
        // Save the new app version and get its ID
        const appId = await saveAppVersion(result.app_jsx_code, userPrompt);
        const appName = `App ${appVersions.length + 1}`;
        
        // Update app versions list
        const updatedVersions = getAllAppVersions();
        setAppVersions(updatedVersions);
        setCurrentAppId(appId);
        
        // Replace loading message with preview message
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === loadingMessageId 
              ? { 
                  id: crypto.randomUUID(), 
                  role: "assistant", 
                  showPreview: true,
                  appId,
                  appName,
                  userPrompt
                }
              : msg
          )
        );
        
        setShowWebContainer(true);
      }
    } catch (e) {
      // Replace loading message with error message
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === loadingMessageId 
            ? { 
                id: crypto.randomUUID(), 
                role: "assistant", 
                content: (e as Error)?.message || "Something went wrong while generating the app."
              }
            : msg
        )
      );
    } finally {
      // Hide loading popup if it was shown
      if (!isWebContainerReady) {
        setTimeout(() => {
          setShowLoadingPopup(false);
        }, 1000);
      }
    }
  }, [value, isLoading, callGenerateAppAPI, isWebContainerReady]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleSwitchApp = useCallback(async (appId: string) => {
    const success = await switchToAppVersion(appId);
    if (success) {
      setCurrentAppId(appId);
    }
  }, []);

  const handleExpandApp = useCallback(async (appId: string) => {
    await handleSwitchApp(appId);
    // The WebContainer will automatically update to show the selected app
  }, [handleSwitchApp]);


  return (
    <>
      <div className="w-full h-screen flex flex-col bg-background">
        {/* App Switcher Header */}
        {appVersions.length > 0 && (
          <div className="border-b p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Current App:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {currentAppId ? appVersions.find(v => v.id === currentAppId)?.name || "Unknown App" : "No App Selected"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {appVersions.map((version) => (
                      <DropdownMenuItem
                        key={version.id}
                        onClick={() => handleSwitchApp(version.id)}
                        className={cn(
                          "cursor-pointer",
                          currentAppId === version.id && "bg-accent"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{version.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {version.userPrompt}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="text-sm text-muted-foreground">
                {appVersions.length} app{appVersions.length !== 1 ? 's' : ''} generated
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
          role="log"
          aria-live="polite"
        >
          {messages.map((m) => (
            <div key={m.id} className="w-full"> 
              {m.showLoading ? (
                <div className="w-full">
                  <div className="flex gap-6 items-start">
                    <div className="w-80 flex-shrink-0">
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-card text-card-foreground p-3">
                          <div className="text-sm text-muted-foreground">Generating your app...</div>
                        </div>
                        <div className="h-[400px]">
                          <div className="w-full h-full rounded-lg border bg-card text-card-foreground overflow-hidden flex items-center justify-center">
                            <AILoadingState />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : m.showPreview ? (
                <div className="w-full">
                  <div className="flex gap-6 items-start">
                    <div className="w-80 flex-shrink-0">
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-card text-card-foreground p-3">
                          <div className="text-sm text-muted-foreground">
                            {m.appName || "App"} generated successfully
                            {m.userPrompt && (
                              <div className="text-xs mt-1 opacity-75">
                                "{m.userPrompt}"
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="h-[400px]">
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
                              <MorphingDialogContent className="w-full h-full max-w-7xl max-h-[90vh] bg-background rounded-lg border shadow-lg flex flex-col">
                                <div className="flex items-center justify-between p-4 border-b">
                                  <MorphingDialogTitle className="text-lg font-semibold">
                                    {m.appName || "App"} - Live Preview
                                  </MorphingDialogTitle>
                                  <MorphingDialogClose />
                                </div>
                                <div className="flex-1 p-4">
                                  {showWebContainer && <WebContainerPreview />}
                                </div>
                              </MorphingDialogContent>
                            </MorphingDialogContainer>
                          </MorphingDialog>
                          ) : (
                            <div className="w-full h-full rounded-lg border bg-card text-card-foreground overflow-hidden flex items-center justify-center">
                              <div className="text-sm text-muted-foreground">Loading preview...</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={cn("w-full flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className="max-w-2xl">
                    <div
                      className={cn(
                        "rounded-lg border p-4",
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
                      )}
                    >
                      {m.content && <div className="whitespace-pre-wrap text-sm">{m.content}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to build something…"
                className="min-h-[56px] flex-1"
              />
              <Button type="button" onClick={handleSubmit} disabled={!value.trim() || isLoading}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Popup */}
      {showLoadingPopup && (
        <WebContainerLoadingPopup 
          isVisible={showLoadingPopup}
          onComplete={() => setShowLoadingPopup(false)}
        />
      )}
    </>
  );
}


