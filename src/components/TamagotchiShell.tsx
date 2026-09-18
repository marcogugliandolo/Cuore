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
    <div className="fixed inset-0 2xl:relative 2xl:min-h-screen 2xl:h-[100dvh] bg-[#9bbc0f] 2xl:bg-teal-600 2xl:flex 2xl:items-center 2xl:justify-center 2xl:p-8 font-sans selection:bg-[#0f380f] selection:text-[#9bbc0f] overflow-hidden select-none">
      {/* ---------------- TAMAGOTCHI DEVICE SHELL / FULLSCREEN MOBILE & TABLET / DESKTOP 2XL ---------------- */}
      <div className="w-full h-full 2xl:max-w-4xl bg-[#9bbc0f] 2xl:bg-rose-500 2xl:rounded-[3.5rem] 2xl:p-7 2xl:shadow-[inset_-4px_-8px_0px_rgba(0,0,0,0.2),0_10px_35px_rgba(0,0,0,0.5)] 2xl:border-[6px] 2xl:border-slate-900 relative flex flex-col overflow-hidden transition-all">
        
        {/* Top bar: Full-width retro LCD header bar across mobile & tablets */}
        <div className="flex justify-between items-center px-4 md:px-8 py-3 pt-safe 2xl:px-2 2xl:py-0 2xl:mb-5 bg-[#8bac0f] 2xl:bg-transparent border-b-4 border-[#0f380f] 2xl:border-b-0 shrink-0 z-20 select-none">
          <div className="flex items-center gap-2 md:gap-3">
            <Heart size={24} className="text-[#0f380f] 2xl:text-white fill-current 2xl:drop-shadow-md md:w-7 md:h-7" />
            <h1 className="text-[#0f380f] 2xl:text-white font-black tracking-widest text-2xl sm:text-3xl md:text-4xl 2xl:drop-shadow-md font-[VT323] uppercase">
              CUORE
            </h1>
            {currentUser && (
              <span className="bg-[#0f380f] text-[#9bbc0f] 2xl:bg-rose-700 2xl:text-white text-xs md:text-sm px-2.5 py-0.5 md:py-1 rounded uppercase font-bold tracking-wider ml-1 shadow-sm">
                {currentUser}
              </span>
            )}
          </div>

          {onLogout && (
            <div className="flex items-center gap-2 2xl:flex-col 2xl:gap-1">
              <span className="hidden 2xl:inline text-rose-200 font-bold text-xs md:text-sm tracking-widest font-[VT323] uppercase">
                Off
              </span>
              <button
                onClick={onLogout}
                title="Apagar (Cerrar sesión)"
                className="flex items-center gap-1.5 px-3 py-1.5 2xl:p-0 2xl:w-11 2xl:h-11 bg-[#0f380f] text-[#9bbc0f] 2xl:bg-rose-700 2xl:text-rose-100 rounded-md 2xl:rounded-full justify-center border-2 2xl:border-t-2 border-[#0f380f] 2xl:border-rose-400 2xl:border-b-4 2xl:border-slate-900 shadow-sm 2xl:shadow-[0_4px_4px_rgba(0,0,0,0.3)] active:scale-95 2xl:active:border-b-0 2xl:active:translate-y-1 transition-all hover:opacity-90 font-[VT323] font-bold text-sm md:text-base"
              >
                <Power size={16} strokeWidth={3.5} className="md:w-5 md:h-5" />
                <span className="2xl:hidden uppercase tracking-wider text-xs md:text-sm font-bold">Salir</span>
              </button>
            </div>
          )}
        </div>

        {/* ---------------- LCD SCREEN (Edge-to-edge on mobile AND tablet, framed on 2xl desktop) ---------------- */}
        <div className="flex-1 min-h-0 bg-[#9bbc0f] 2xl:border-[5px] 2xl:border-slate-900 2xl:rounded-2xl 2xl:shadow-[inset_4px_4px_0px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col">
          {/* Subtle CRT / LCD scanline vignette effect on 2xl desktop */}
          <div className="hidden 2xl:block absolute inset-0 pointer-events-none shadow-[inset_0_0_24px_rgba(15,56,15,0.25)] z-30"></div>
          
          <main className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 lg:p-8 text-[#0f380f] relative z-10 custom-scrollbar font-[VT323]">
            <div className="max-w-4xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>

        {/* ---------------- NAVIGATION BUTTONS (PERMANENTLY FIXED AT BOTTOM DOCK ACROSS MOBILE & TABLETS) ---------------- */}
        {showButtons && buttons && (
          <div className="shrink-0 z-30 bg-[#8bac0f] 2xl:bg-transparent border-t-4 border-[#0f380f] 2xl:border-t-0 py-2.5 pb-safe 2xl:pb-0 px-4 md:px-8 2xl:mt-6 2xl:mb-3 flex justify-around items-center touch-manipulation">
            <div className="max-w-4xl mx-auto w-full flex justify-around items-center">
              {buttons}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
