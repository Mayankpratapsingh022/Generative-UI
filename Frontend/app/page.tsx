"use client";

import AI_Prompt from "@/components/kokonutui/ai-prompt";
import Image from "next/image";
import WebContainerPreview from "@/components/WebContainerPreview";

export default function Home() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <AI_Prompt/>
      <div className="mt-10">
        <WebContainerPreview />
      </div>
    </div>
  );
}
