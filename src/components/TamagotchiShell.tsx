import { ReactNode } from "react";
import { Power, Heart } from "lucide-react";

interface TamagotchiShellProps {
  children: ReactNode;
  onLogout?: () => void;
  showButtons?: boolean;
  buttons?: ReactNode;
  currentUser?: string;
}

export function TamagotchiShell({ children, onLogout, showButtons = false, buttons, currentUser }: TamagotchiShellProps) {
  return (
    <div className="fixed inset-0 sm:relative sm:min-h-screen sm:h-[100dvh] bg-[#9bbc0f] sm:bg-teal-600 sm:flex sm:items-center sm:justify-center sm:p-4 font-sans selection:bg-[#0f380f] selection:text-[#9bbc0f] overflow-hidden select-none">
      {/* ---------------- TAMAGOTCHI DEVICE SHELL / FULLSCREEN MOBILE ---------------- */}
      <div className="w-full sm:max-w-md bg-[#9bbc0f] sm:bg-rose-500 sm:rounded-[3rem] sm:p-5 sm:shadow-[inset_-4px_-8px_0px_rgba(0,0,0,0.2),0_10px_30px_rgba(0,0,0,0.5)] sm:border-4 sm:border-slate-900 relative flex flex-col h-full sm:h-[95vh] overflow-hidden">
        
        {/* Top bar: In mobile, a sleek retro green LCD header bar with pt-safe for iPhone notch / Dynamic Island; in desktop, the Tamagotchi shell top */}
        <div className="flex justify-between items-center px-4 py-3 pt-safe sm:px-2 sm:py-0 sm:mb-4 bg-[#8bac0f] sm:bg-transparent border-b-4 border-[#0f380f] sm:border-b-0 shrink-0 z-20 select-none">
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-[#0f380f] sm:text-white fill-current sm:drop-shadow-md" />
            <h1 className="text-[#0f380f] sm:text-white font-black tracking-widest text-2xl sm:text-3xl sm:drop-shadow-md font-[VT323] uppercase">
              CUORE
            </h1>
            {currentUser && (
              <span className="bg-[#0f380f] text-[#9bbc0f] sm:bg-rose-700 sm:text-white text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider ml-1">
                {currentUser}
              </span>
            )}
          </div>
          {onLogout && (
            <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
              <span className="hidden sm:inline text-rose-200 font-bold text-xs tracking-widest font-[VT323] uppercase">
                Off
              </span>
              <button
                onClick={onLogout}
                title="Apagar (Cerrar sesión)"
                className="flex items-center gap-1.5 px-2.5 py-1 sm:p-0 sm:w-8 sm:h-8 bg-[#0f380f] text-[#9bbc0f] sm:bg-rose-700 sm:text-rose-100 rounded-md sm:rounded-full justify-center border-2 sm:border-t-2 border-[#0f380f] sm:border-rose-400 sm:border-b-4 sm:border-slate-900 shadow-sm sm:shadow-[0_4px_4px_rgba(0,0,0,0.3)] active:scale-95 sm:active:border-b-0 sm:active:translate-y-1 transition-all hover:opacity-90 font-[VT323] font-bold text-sm"
              >
                <Power size={14} strokeWidth={3.5} />
                <span className="sm:hidden uppercase tracking-wider text-xs">Salir</span>
              </button>
            </div>
          )}
        </div>

        {/* ---------------- LCD SCREEN (Edge-to-edge on mobile, framed on desktop) ---------------- */}
        <div className="flex-1 min-h-0 bg-[#9bbc0f] sm:border-4 sm:border-slate-900 sm:rounded-xl sm:shadow-[inset_4px_4px_0px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col">
          {/* Subtle CRT / LCD scanline vignette effect only on desktop frame */}
          <div className="hidden sm:block absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(15,56,15,0.2)] z-30"></div>
          
          <main className="flex-1 overflow-y-auto overscroll-contain p-4 text-[#0f380f] relative z-10 custom-scrollbar font-[VT323]">
            {children}
          </main>
        </div>

        {/* ---------------- NAVIGATION BUTTONS (PERMANENTLY FIXED AT BOTTOM DOCK) ---------------- */}
        {showButtons && buttons && (
          <div className="shrink-0 z-30 bg-[#8bac0f] sm:bg-transparent border-t-4 border-[#0f380f] sm:border-t-0 py-2 sm:py-0 pb-safe sm:pb-0 px-3 sm:mt-5 sm:mb-2 flex justify-around items-center touch-manipulation">
            {buttons}
          </div>
        )}
      </div>
    </div>
  );
}
