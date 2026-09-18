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
        className="flex flex-col items-center gap-2 group"
      >
        <div className={cn(
          "w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-slate-900 flex items-center justify-center transition-all",
          isActive 
            ? "bg-yellow-400 translate-y-1 shadow-none" 
            : "bg-blue-400 shadow-[0_4px_0_#0f172a] group-hover:translate-y-0.5 group-hover:shadow-[0_2px_0_#0f172a]"
        )}>
          <tab.icon size={20} className="text-slate-900" strokeWidth={3} />
        </div>
        <span className="text-white font-bold text-sm tracking-wider drop-shadow-md font-[VT323]">
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
