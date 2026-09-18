import { ReactNode } from "react";
import { Power, Heart } from "lucide-react";

interface TamagotchiShellProps {
  children: ReactNode;
  onLogout?: () => void;
  showButtons?: boolean;
  buttons?: ReactNode;
}

export function TamagotchiShell({ children, onLogout, showButtons = false, buttons }: TamagotchiShellProps) {
  return (
    <div className="min-h-screen bg-teal-600 flex items-center justify-center p-2 sm:p-4 font-sans selection:bg-[#0f380f] selection:text-[#9bbc0f]">
      {/* ---------------- TAMAGOTCHI DEVICE SHELL ---------------- */}
      <div className="w-full max-w-md bg-rose-500 rounded-[3rem] p-4 sm:p-6 shadow-[inset_-4px_-8px_0px_rgba(0,0,0,0.2),0_10px_30px_rgba(0,0,0,0.5)] border-4 border-slate-900 relative flex flex-col h-[95vh]">
        
        {/* Top decoration */}
        <div className="flex justify-between items-start mb-4 px-2">
          <div className="flex items-center gap-2 mt-2">
            <Heart size={24} className="text-white fill-white drop-shadow-md" />
            <h1 className="text-white font-black tracking-widest text-3xl drop-shadow-md font-[VT323] uppercase">CUORE</h1>
          </div>
          {onLogout && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-rose-200 font-bold text-sm tracking-widest font-[VT323] leading-none drop-shadow-sm uppercase">Off</span>
              <button
                onClick={onLogout}
                title="Apagar (Cerrar sesión)"
                className="w-8 h-8 bg-rose-700 text-rose-100 rounded-full flex items-center justify-center border-t-2 border-rose-400 border-b-4 border-slate-900 shadow-[0_4px_4px_rgba(0,0,0,0.3)] active:border-b-0 active:translate-y-1 transition-all hover:bg-rose-600 hover:text-white"
              >
                <Power size={14} strokeWidth={4} />
              </button>
            </div>
          )}
        </div>

        {/* ---------------- LCD SCREEN ---------------- */}
        <div className="flex-1 bg-[#9bbc0f] border-4 border-slate-900 rounded-lg shadow-[inset_4px_4px_0px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col">
          {/* Screen inner shadow for depth */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(15,56,15,0.2)] z-50"></div>
          
          <main className="flex-1 overflow-y-auto p-4 text-[#0f380f] relative z-10 custom-scrollbar font-[VT323]">
            {children}
          </main>
        </div>

        {/* ---------------- BUTTONS ---------------- */}
        {showButtons && buttons && (
          <div className="mt-6 mb-2 flex justify-around items-center px-4">
            {buttons}
          </div>
        )}
      </div>
    </div>
  );
}
