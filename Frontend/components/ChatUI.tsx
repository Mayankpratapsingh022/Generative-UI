"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WebContainerPreview from "@/components/WebContainerPreview";
import { ensureWebContainer, updateAppTsx } from "@/lib/webcontainerClient";
import { Loader2, Maximize2 } from "lucide-react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogClose,
} from "@/components/motion-primitives/morphing-dialog";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content?: string;
  showPreview?: boolean;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

    try {
      const result = await callGenerateAppAPI(userPrompt);
      if (result?.app_jsx_code) {
        await ensureWebContainer();
        await updateAppTsx(result.app_jsx_code);
      }
      // Add assistant bubble on the left with the preview iframe
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          showPreview: true,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            (e as Error)?.message || "Something went wrong while generating the app.",
        },
      ]);
    }
  }, [value, isLoading, callGenerateAppAPI]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );


  return (
    <>
      <div className="w-full h-screen flex flex-col bg-background">
        

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
          role="log"
          aria-live="polite"
        >
          {messages.map((m) => (
            <div key={m.id} className="w-full"> 
              {m.showPreview ? (
                <div className="w-full">
                  <div className="flex gap-6 items-start">
                    <div className="w-80 flex-shrink-0">
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-card text-card-foreground p-3">
                          <div className="text-sm text-muted-foreground">App generated successfully</div>
                        </div>
                        <div className="h-[400px]">
                          <MorphingDialog>
                            <MorphingDialogTrigger className="relative w-full h-full rounded-lg border bg-card text-card-foreground overflow-hidden">
                              <div className="absolute top-2 right-2 z-10">
                                <div className="h-8 w-8 rounded-md bg-secondary/90 hover:bg-secondary flex items-center justify-center cursor-pointer shadow-sm">
                                  <Maximize2 className="h-4 w-4" />
                                </div>
                              </div>
                              <WebContainerPreview />
                            </MorphingDialogTrigger>
                            
                            <MorphingDialogContainer>
                              <MorphingDialogContent className="w-full h-full max-w-7xl max-h-[90vh] bg-background rounded-lg border shadow-lg flex flex-col">
                                <div className="flex items-center justify-between p-4 border-b">
                                  <MorphingDialogTitle className="text-lg font-semibold">
                                    WebContainer Preview
                                  </MorphingDialogTitle>
                                  <MorphingDialogClose />
                                </div>
                                <div className="flex-1 p-4">
                                  <WebContainerPreview />
                                </div>
                              </MorphingDialogContent>
                            </MorphingDialogContainer>
                          </MorphingDialog>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-lg border bg-card text-card-foreground p-4">
                        {m.content && <div className="whitespace-pre-wrap text-sm">{m.content}</div>}
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

    </>
  );
}


