"use client";

/**
 * @author: @kokonutui
 * @description: AI Input Search
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Globe, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { ensureWebContainer, saveAppVersion } from "@/lib/webcontainerClient";
import { BackendErrorDialog } from "@/components/ui/backend-error-dialog";
import { API_URLS } from "@/lib/config";

interface AI_Input_SearchProps {
    onMessageSubmit?: (message: string) => void;
    isLoading?: boolean;
}

export default function AI_Input_Search({ onMessageSubmit, isLoading: externalLoading = false }: AI_Input_SearchProps) {
    const [value, setValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showBackendError, setShowBackendError] = useState(false);
    const [lastUserPrompt, setLastUserPrompt] = useState<string>("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 52,
        maxHeight: 200,
    });
    const [showSearch, setShowSearch] = useState(true);
    const [isFocused, setIsFocused] = useState(false);

    const callGenerateAppAPI = async (userPrompt: string) => {
        try {
            setIsLoading(true);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(API_URLS.GENERATE_APP, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_prompt: userPrompt }),
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            // Re-throw the error to be handled by the calling function
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const isActuallyLoading = isLoading || externalLoading;

    const handleSubmit = async () => {
        if (!value.trim() || isActuallyLoading) return;
        
        const userPrompt = value.trim();
        setValue("");
        adjustHeight(true);
        
        // Call the parent callback if provided
        if (onMessageSubmit) {
            onMessageSubmit(userPrompt);
            return;
        }
        
        // Fallback to original behavior
        try {
            setLastUserPrompt(userPrompt);
            const result = await callGenerateAppAPI(userPrompt);
            if (result?.app_jsx_code) {
                await ensureWebContainer();
                await saveAppVersion(result.app_jsx_code, userPrompt);
            }
        } catch (error) {
            // Check if it's a network/connection error or timeout
            if (error instanceof TypeError && (error.message === "Failed to fetch" || error.name === "AbortError")) {
                console.log("AI Input Search: Backend connection error detected, showing modal");
                setShowBackendError(true);
            } else {
                console.error("Failed to generate app:", error);
            }
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleContainerClick = () => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    return (
        <>
        <div className="w-full">
            <div className="relative w-full">
                <div
                    role="textbox"
                    tabIndex={0}
                    aria-label="Search input container"
                    className={cn(
                        "relative flex flex-col rounded-xl transition-all duration-200 w-full text-left cursor-text",
                        "ring-1 ring-black/10 dark:ring-white/10",
                        isFocused && "ring-black/20 dark:ring-white/20"
                    )}
                    onClick={handleContainerClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            handleContainerClick();
                        }
                    }}
                >
                    <div className="overflow-y-auto max-h-[200px]">
                        <Textarea
                            id="ai-input-04"
                            value={value}
                            placeholder="Ask me to build something..."
                            className="w-full rounded-xl px-4 py-3 bg-black/5 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 leading-[1.2]"
                            ref={textareaRef}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            onChange={(e) => {
                                setValue(e.target.value);
                                adjustHeight();
                            }}
                        />
                    </div>

                    <div className="h-12 bg-black/5 dark:bg-white/5 rounded-xl">
                        <div className="absolute left-3 bottom-3 flex items-center gap-2">
                            <label className="cursor-pointer rounded-lg p-2 bg-black/5 dark:bg-white/5">
                                <input type="file" className="hidden" />
                                <Paperclip className="w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" />
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSearch(!showSearch);
                                }}
                                className={cn(
                                    "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8 cursor-pointer",
                                    showSearch
                                        ? "bg-sky-500/15 border-sky-400 text-sky-500"
                                        : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white "
                                )}
                            >
                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    <motion.div
                                        animate={{
                                            rotate: showSearch ? 180 : 0,
                                            scale: showSearch ? 1.1 : 1,
                                        }}
                                        whileHover={{
                                            rotate: showSearch ? 180 : 15,
                                            scale: 1.1,
                                            transition: {
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 10,
                                            },
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 260,
                                            damping: 25,
                                        }}
                                    >
                                        <Globe
                                            className={cn(
                                                "w-4 h-4",
                                                showSearch
                                                    ? "text-sky-500"
                                                    : "text-inherit"
                                            )}
                                        />
                                    </motion.div>
                                </div>
                                <AnimatePresence>
                                    {showSearch && (
                                        <motion.span
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{
                                                width: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-sm overflow-hidden whitespace-nowrap text-sky-500 shrink-0"
                                        >
                                            Search
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                        <div className="absolute right-3 bottom-3">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!value.trim() || isActuallyLoading}
                                className={cn(
                                    "rounded-lg p-2 transition-colors",
                                    value && !isActuallyLoading
                                        ? "bg-sky-500/15 text-sky-500"
                                        : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer",
                                    isActuallyLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isActuallyLoading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.div>
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Backend Error Dialog */}
        <BackendErrorDialog
            open={showBackendError}
            onOpenChange={setShowBackendError}
            onRetry={() => {
                if (lastUserPrompt) {
                    handleSubmit();
                }
            }}
        />
        </>
    );
}
