import { Home, ScanBarcode, LineChart, LogOut } from "lucide-react";
import { FoodEntry } from "@/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: "dashboard" | "search" | "progress";
  setActiveTab: (tab: "dashboard" | "search" | "progress") => void;
  onLogout: () => void;
  entries?: FoodEntry[];
}

export function Layout({ children, activeTab, setActiveTab, onLogout }: LayoutProps) {
  const tabs = [
    { id: "dashboard" as const, label: "HOY", icon: Home },
    { id: "search" as const, label: "BUSCAR", icon: ScanBarcode },
    { id: "progress" as const, label: "STATS", icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-teal-600 flex items-center justify-center p-2 sm:p-4 font-sans selection:bg-[#0f380f] selection:text-[#9bbc0f]">
      {/* ---------------- TAMAGOTCHI DEVICE SHELL ---------------- */}
      <div className="w-full max-w-md bg-rose-500 rounded-[3rem] p-4 sm:p-6 shadow-[inset_-4px_-8px_0px_rgba(0,0,0,0.2),0_10px_30px_rgba(0,0,0,0.5)] border-4 border-slate-900 relative flex flex-col h-[95vh]">
        
        {/* Top decoration */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h1 className="text-white font-black tracking-widest text-2xl drop-shadow-md font-[VT323]">TAMA-DIETA</h1>
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all"
          >
            <LogOut size={16} strokeWidth={3} />
          </button>
        </div>

        {/* ---------------- LCD SCREEN ---------------- */}
        <div className="flex-1 bg-[#9bbc0f] border-4 border-slate-900 rounded-lg shadow-[inset_4px_4px_0px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col">
          {/* Screen inner shadow for depth */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(15,56,15,0.2)] z-50"></div>
          
          <main className="flex-1 overflow-y-auto p-4 text-[#0f380f] relative z-10 custom-scrollbar font-[VT323]">
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
          </main>
        </div>

        {/* ---------------- BUTTONS ---------------- */}
        <div className="mt-6 mb-2 flex justify-around items-center px-4">
          {tabs.map((tab) => {
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
          })}
        </div>
      </div>
    </div>
  );
}
