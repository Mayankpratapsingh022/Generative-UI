import ChatUI from "@/components/ChatUI";
import CustomSidebar from "@/components/CustomSidebar";

export default function UsePage() {
  return (
    <div className="flex h-screen w-full bg-neutral-950">
      <CustomSidebar />
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <ChatUI />
      </main>
    </div>
  );
}
