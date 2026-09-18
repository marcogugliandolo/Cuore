import { Home, ScanBarcode, LineChart } from "lucide-react";
import type { ReactNode } from "react";
import { FoodEntry } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { TamagotchiShell } from "./TamagotchiShell";

interface LayoutProps {
  children: ReactNode;
  activeTab: "dashboard" | "search" | "progress";
  setActiveTab: (tab: "dashboard" | "search" | "progress") => void;
  onLogout: () => void;
  entries?: FoodEntry[];
  currentUser?: string;
}

export function Layout({ children, activeTab, setActiveTab, onLogout, currentUser }: LayoutProps) {
  const tabs = [
    { id: "dashboard" as const, label: "HOY", icon: Home },
    { id: "search" as const, label: "BUSCAR", icon: ScanBarcode },
    { id: "progress" as const, label: "INFORMES", icon: LineChart },
  ];

  const buttons = tabs.map((tab) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className="flex flex-col items-center gap-1 group flex-1 max-w-[100px] md:max-w-[140px] py-1 transition-transform active:scale-95"
      >
        <div className={cn(
          "w-11 h-11 md:w-14 md:h-14 2xl:w-16 2xl:h-16 rounded-xl 2xl:rounded-full border-2 md:border-3 2xl:border-[5px] border-[#0f380f] 2xl:border-slate-900 flex items-center justify-center transition-all",
          isActive 
            ? "bg-[#0f380f] text-[#9bbc0f] 2xl:bg-yellow-400 2xl:text-slate-900 translate-y-0.5 shadow-none" 
            : "bg-[#9bbc0f] text-[#0f380f] 2xl:bg-blue-400 2xl:text-slate-900 shadow-[0_2px_0_#0f380f] 2xl:shadow-[0_6px_0_#0f172a] group-hover:translate-y-0.5"
        )}>
          <tab.icon size={20} className="md:w-6 md:h-6 2xl:w-7 2xl:h-7" strokeWidth={3} />
        </div>
        <span className={cn(
          "text-xs md:text-sm 2xl:text-base font-bold tracking-wider font-[VT323] uppercase transition-colors",
          isActive 
            ? "text-[#0f380f] font-black 2xl:text-white 2xl:drop-shadow-md" 
            : "text-[#0f380f]/80 2xl:text-white/90 2xl:drop-shadow-md"
        )}>
          {tab.label}
        </span>
      </button>
    );
  });

  return (
    <TamagotchiShell onLogout={onLogout} showButtons={true} buttons={buttons} currentUser={currentUser}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="pb-6"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </TamagotchiShell>
  );
}
