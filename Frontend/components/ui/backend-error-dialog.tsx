"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface BackendErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry?: () => void
}

export function BackendErrorDialog({ 
  open, 
  onOpenChange, 
  onRetry 
}: BackendErrorDialogProps) {
  console.log("BackendErrorDialog render:", { open, onOpenChange: !!onOpenChange, onRetry: !!onRetry });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-white">Backend Service Unavailable</DialogTitle>
              <DialogDescription className="text-neutral-400">
                The backend server is not responding
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-neutral-300 leading-relaxed">
            The owner has stopped the backend service. Please contact the owner to restart it to use this app.
          </p>
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <p className="text-xs text-neutral-400">
              <strong>Technical Details:</strong> Failed to connect to backend
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            Close
          </Button>
          {onRetry && (
            <Button
              onClick={() => {
                onRetry()
                onOpenChange(false)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
