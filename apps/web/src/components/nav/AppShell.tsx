import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomTabs } from "./BottomTabs";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <Sidebar />
      <div className="md:pl-64">
        <TopBar />
        <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 md:px-10 md:pb-16 md:pt-10">
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}