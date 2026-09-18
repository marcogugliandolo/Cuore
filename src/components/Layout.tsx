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
}

export function Layout({ children, activeTab, setActiveTab, onLogout }: LayoutProps) {
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
        className="flex flex-col items-center gap-1 sm:gap-2 group flex-1 max-w-[90px] py-1 transition-transform active:scale-95"
      >
        <div className={cn(
          "w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-full border-2 sm:border-4 border-[#0f380f] sm:border-slate-900 flex items-center justify-center transition-all",
          isActive 
            ? "bg-[#0f380f] text-[#9bbc0f] sm:bg-yellow-400 sm:text-slate-900 translate-y-0.5 sm:translate-y-1 shadow-none" 
            : "bg-[#9bbc0f] text-[#0f380f] sm:bg-blue-400 sm:text-slate-900 shadow-[0_2px_0_#0f380f] sm:shadow-[0_4px_0_#0f172a] group-hover:translate-y-0.5"
        )}>
          <tab.icon size={18} className="sm:w-5 sm:h-5" strokeWidth={3} />
        </div>
        <span className={cn(
          "text-xs sm:text-sm font-bold tracking-wider font-[VT323] uppercase transition-colors",
          isActive 
            ? "text-[#0f380f] font-black sm:text-white sm:drop-shadow-md" 
            : "text-[#0f380f]/80 sm:text-white/90 sm:drop-shadow-md"
        )}>
          {tab.label}
        </span>
      </button>
    );
  });

  return (
    <TamagotchiShell onLogout={onLogout} showButtons={true} buttons={buttons}>
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
