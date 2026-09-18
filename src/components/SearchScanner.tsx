import { useState, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { Search as SearchIcon, Camera, Loader2 } from "lucide-react";
import { FoodEntry } from "../types";
import { classifyFood, scanLabel } from "../api";
import { cn } from "../lib/utils";

export function SearchScanner({ onAddEntry }: { onAddEntry: (e: Omit<FoodEntry, "id" | "timestamp">) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<Omit<FoodEntry, "id" | "timestamp"> | null>(null);
  const [mealType, setMealType] = useState<"Desayuno" | "Comida" | "Cena" | "Otro">("Comida");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await classifyFood(searchTerm);
      setResult({ name: searchTerm.trim(), ...res });
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al analizar el alimento. Inténtalo de nuevo.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const res = await scanLabel(file);
      setResult({ 
        name: res.name || "Producto escaneado", 
        status: res.status, 
        reason: res.reason 
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al analizar la imagen. Inténtalo de nuevo.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b-4 border-[#0f380f] pb-4">
        <h1 className="text-4xl font-bold tracking-tight uppercase">BUSCAR</h1>
        <p className="text-xl font-bold">¿QUÉ ES ESTO?</p>
      </header>

      {errorMessage && (
        <div className="bg-[#0f380f] text-[#9bbc0f] p-3 text-center font-bold text-lg rounded-xl animate-pulse">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative border-4 border-[#0f380f] bg-[#8bac0f] rounded-xl overflow-hidden">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="EJ: GALLETAS, NUECES, ARROZ..."
            className="w-full bg-transparent py-4 pl-4 pr-16 text-2xl focus:outline-none placeholder-[#0f380f]/50 font-bold uppercase"
            disabled={isSearching || isScanning}
          />
          <button
            type="submit"
            disabled={isSearching || isScanning || !searchTerm.trim()}
            className="absolute right-0 top-0 bottom-0 bg-[#0f380f] text-[#9bbc0f] px-4 flex items-center justify-center disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={24} className="animate-spin" /> : <SearchIcon size={24} strokeWidth={3} />}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-1 bg-[#0f380f]" />
        <span className="text-xl font-bold uppercase">O ESCANEAR</span>
        <div className="flex-1 h-1 bg-[#0f380f]" />
      </div>

      <div className="flex justify-center">
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSearching || isScanning}
          className="flex flex-col items-center justify-center gap-2 p-8 border-4 border-[#0f380f] bg-[#8bac0f] active:bg-[#0f380f] active:text-[#9bbc0f] rounded-xl transition-all w-full disabled:opacity-50 font-bold uppercase text-2xl hover:bg-[#9bbc0f] shadow-[inset_0_-4px_0_rgba(15,56,15,1)] hover:translate-y-1 hover:shadow-none"
        >
          {isScanning ? (
            <Loader2 size={40} className="animate-spin" />
          ) : (
            <Camera size={40} strokeWidth={3} />
          )}
          <span>CÁMARA</span>
        </button>
      </div>

      {result && (
        <div className="mt-8 border-4 border-[#0f380f] bg-[#8bac0f] p-6 rounded-xl relative">
          <div className="flex flex-col gap-2 mb-4">
            <h3 className="text-3xl font-black uppercase break-words">{result.name}</h3>
            <div className="self-start border-2 border-[#0f380f] bg-[#9bbc0f] px-3 py-1 text-xl font-bold uppercase rounded-full">
              {result.status}
            </div>
          </div>
          
          <p className="text-xl font-bold leading-tight mb-6">{result.reason}</p>

          <div className="mb-6 space-y-2">
            <p className="text-xl font-black uppercase">Momento:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["Desayuno", "Comida", "Cena", "Otro"] as const).map(type => (
                <button 
                  type="button" 
                  key={type} 
                  onClick={() => setMealType(type)}
                  className={cn("border-4 border-[#0f380f] py-2 text-xl font-bold transition-colors uppercase", mealType === type ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#9bbc0f]")}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => {
              onAddEntry({ ...result, mealType });
              setResult(null);
              setSearchTerm("");
            }}
            className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-4 border-4 border-[#0f380f] rounded-xl active:bg-[#9bbc0f] active:text-[#0f380f] transition-colors"
          >
            AÑADIR
          </button>
        </div>
      )}
    </div>
  );
}
