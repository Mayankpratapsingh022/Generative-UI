"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { onServerReadyOnce } from "@/lib/webcontainerClient";

type LoadingStep = {
  id: string;
  message: string;
  progress: number;
};

const loadingSteps: LoadingStep[] = [
  { id: "starting", message: "Starting…", progress: 10 },
  { id: "updating", message: "Updating app code...", progress: 50 },
  { id: "refreshing", message: "Refreshing preview...", progress: 80 },
  { id: "running", message: "Running", progress: 100 },
];

type WebContainerLoadingPopupProps = {
  isVisible: boolean;
  onComplete: () => void;
};

export default function WebContainerLoadingPopup({ isVisible, onComplete }: WebContainerLoadingPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Starting…");
  const [hasCompleted, setHasCompleted] = useState(false);
  const removeListenerRef = useRef<(() => void) | null>(null);

  // Reset completion state when popup is hidden
  useEffect(() => {
    if (!isVisible) {
      setHasCompleted(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || hasCompleted) return;

    // Reset state when popup becomes visible
    setCurrentStep(0);
    setProgress(10);
    setStatus("Starting…");

    // Check if WebContainer is already running
    const existingUrl = (window as any).__wc_server_url__;
    if (existingUrl) {
      setStatus("Running");
      setProgress(100);
      setCurrentStep(3);
      setHasCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 500); // Shorter delay since it's already ready
      return;
    }

    // Listen for WebContainer server ready event
    removeListenerRef.current = onServerReadyOnce((url) => {
      setStatus("Running");
      setProgress(100);
      setCurrentStep(3);
      setHasCompleted(true);
      
      // Hide popup after showing "Running" for a moment
      setTimeout(() => {
        onComplete();
      }, 1500);
    });

    // Simulate the loading steps based on real WebContainer process
    const stepTimeouts: NodeJS.Timeout[] = [];

    // Step 1: Starting (immediate)
    setStatus("Starting…");
    setProgress(10);
    setCurrentStep(0);

    // Step 2: Updating app code (after 500ms)
    const timeout1 = setTimeout(() => {
      setStatus("Updating app code...");
      setProgress(50);
      setCurrentStep(1);
    }, 500);
    stepTimeouts.push(timeout1);

    // Step 3: Refreshing preview (after 1 second)
    const timeout2 = setTimeout(() => {
      setStatus("Refreshing preview...");
      setProgress(80);
      setCurrentStep(2);
    }, 1000);
    stepTimeouts.push(timeout2);

    return () => {
      // Clean up timeouts
      stepTimeouts.forEach(clearTimeout);
      // Clean up listener
      if (removeListenerRef.current) {
        removeListenerRef.current();
        removeListenerRef.current = null;
      }
    };
  }, [isVisible, onComplete, hasCompleted]);

  const currentStepData = loadingSteps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-lg p-4"
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Generating App
              </h3>
              <div className="text-xs text-muted-foreground">
                {progress}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Current Step Message */}
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              {status}
            </motion.div>

            {/* Step Indicators */}
            <div className="flex space-x-1">
              {loadingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    index <= currentStep
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
