import { useState } from "react";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { FoodEntry, AnalyticsEntry, WeightEntry } from "../types";
import { classifyFood } from "../api";
import { cn } from "@/lib/utils";

interface DashboardProps {
  entries: FoodEntry[];
  onAddEntry: (entry: Omit<FoodEntry, "id" | "timestamp">) => void;
  onDeleteEntry: (id: string) => void;
  analyticsData: AnalyticsEntry[];
  weightData: WeightEntry[];
  onAddWeight: (entry: Omit<WeightEntry, "id">) => void;
}

export function Dashboard({ entries, onAddEntry, onDeleteEntry, analyticsData, weightData, onAddWeight }: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"comida" | "peso">("comida");
  
  const [newItem, setNewItem] = useState("");
  const [mealType, setMealType] = useState<"Desayuno" | "Comida" | "Cena" | "Otro">("Comida");
  const [isAdding, setIsAdding] = useState(false);
  
  const [todayWeight, setTodayWeight] = useState("");

  const todayEntries = entries.filter((e) => isToday(e.timestamp));
  const pastEntries = entries.filter((e) => !isToday(e.timestamp));

  const latestAnalytics = analyticsData.length > 0 ? analyticsData[analyticsData.length - 1] : null;
  const todayWeightEntry = weightData.find(w => w.date === format(new Date(), "yyyy-MM-dd"));

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setIsAdding(true);
    try {
      const { status, reason } = await classifyFood(newItem);
      onAddEntry({ name: newItem.trim(), status, reason, mealType });
      setNewItem("");
      setIsModalOpen(false);
    } catch (error) {
      alert("Error al analizar el alimento.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayWeight) return;
    onAddWeight({ date: format(new Date(), "yyyy-MM-dd"), weight: Number(todayWeight) });
    setTodayWeight("");
    setIsModalOpen(false);
  };

  const getDayIndicator = () => {
    if (todayEntries.length === 0) return "Moderado";
    const avoidCount = todayEntries.filter(e => e.status === "Evitar").length;
    const goodCount = todayEntries.filter(e => e.status === "Bueno").length;
    if (avoidCount > 0) return "Evitar"; 
    if (goodCount > todayEntries.length / 2) return "Bueno";
    return "Moderado";
  };

  const dayStatus = getDayIndicator();
  const petFaces = {
    Bueno: "( ^ _ ^ )",
    Moderado: "( = _ = )",
    Evitar: "( > _ < )"
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <header className="border-b-4 border-[#0f380f] pb-4">
        <h1 className="text-4xl font-bold tracking-tight uppercase">HOLA MARCO</h1>
        <p className="text-xl font-bold">
          {format(new Date(), "dd/MM/yyyy")}
        </p>
      </header>

      {/* VIRTUAL PET AREA */}
      <div className="flex flex-col items-center justify-center py-6 border-4 border-[#0f380f] rounded-xl bg-[#8bac0f]">
        <div className="text-6xl font-bold mb-4 animate-bounce">
          {petFaces[dayStatus as keyof typeof petFaces]}
        </div>
        <p className="text-xl font-bold uppercase">Estado: {dayStatus}</p>
      </div>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-4">
        <div className="border-4 border-[#0f380f] p-4 rounded-xl flex flex-col justify-center">
          <p className="text-sm font-bold uppercase">Triglicéridos</p>
          <p className="text-3xl font-black mt-2">
            {latestAnalytics?.triglycerides || "---"}
          </p>
        </div>
        <div className="border-4 border-[#0f380f] p-4 rounded-xl flex flex-col justify-center">
          <p className="text-sm font-bold uppercase">Peso</p>
          <p className="text-3xl font-black mt-2">
            {todayWeightEntry?.weight || "---"} kg
          </p>
        </div>
      </section>

      {/* BIG ACTION BUTTON */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-4 border-4 border-[#0f380f] rounded-xl active:bg-[#9bbc0f] active:text-[#0f380f] transition-colors"
      >
        REGISTRAR
      </button>

      {/* ENTRIES LIST */}
      <section className="space-y-4 pt-4 border-t-4 border-[#0f380f]">
        <h2 className="text-2xl font-bold uppercase">Registro de Hoy</h2>
        
        {todayEntries.length === 0 ? (
          <p className="text-xl text-center py-4 border-2 border-dashed border-[#0f380f]">Vacio...</p>
        ) : (
          <div className="space-y-3">
            {todayEntries.map(entry => (
              <EntryRow key={entry.id} entry={entry} onDelete={() => onDeleteEntry(entry.id)} />
            ))}
          </div>
        )}
      </section>

      {/* MODAL (POPUP) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#9bbc0f] border-8 border-[#0f380f] rounded-2xl p-6 shadow-2xl relative font-[VT323] text-[#0f380f]">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-2xl font-black w-10 h-10 flex justify-center items-center hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors rounded-full"
            >
              X
            </button>

            <h2 className="text-3xl font-bold mb-6 text-center uppercase">Nuevo Registro</h2>

            <div className="flex border-4 border-[#0f380f] rounded-lg mb-6 overflow-hidden font-bold">
              <button 
                onClick={() => setModalTab("comida")}
                className={cn("flex-1 py-2 text-xl", modalTab === "comida" ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#8bac0f]")}
              >
                Comida
              </button>
              <div className="w-1 bg-[#0f380f]"></div>
              <button 
                onClick={() => setModalTab("peso")}
                className={cn("flex-1 py-2 text-xl", modalTab === "peso" ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#8bac0f]")}
              >
                Peso
              </button>
            </div>

            {modalTab === "comida" && (
              <form onSubmit={handleAddFood} className="space-y-6">
                <div>
                  <label className="block text-xl font-bold mb-2">¿Qué has comido?</label>
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Ej: Galletas..."
                    className="w-full border-4 border-[#0f380f] bg-transparent p-3 text-2xl focus:outline-none placeholder-[#0f380f]/50 font-bold"
                    disabled={isAdding}
                  />
                </div>
                <div>
                  <label className="block text-xl font-bold mb-2">Momento del día</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Desayuno", "Comida", "Cena", "Otro"] as const).map(type => (
                      <button 
                        type="button" 
                        key={type} 
                        onClick={() => setMealType(type)}
                        className={cn("border-4 border-[#0f380f] py-2 text-lg font-bold transition-colors", mealType === type ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#8bac0f]")}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isAdding || !newItem.trim()}
                  className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-4 border-4 border-[#0f380f] disabled:opacity-50"
                >
                  {isAdding ? <Loader2 size={32} className="animate-spin mx-auto" /> : "GUARDAR COMIDA"}
                </button>
              </form>
            )}

            {modalTab === "peso" && (
              <form onSubmit={handleSaveWeight} className="space-y-6">
                <div>
                  <label className="block text-xl font-bold mb-2">Peso actual (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={todayWeight}
                    onChange={(e) => setTodayWeight(e.target.value)}
                    placeholder="Ej: 75.5"
                    className="w-full border-4 border-[#0f380f] bg-transparent p-3 text-2xl focus:outline-none placeholder-[#0f380f]/50 font-bold"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!todayWeight}
                  className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-4 border-4 border-[#0f380f] disabled:opacity-50"
                >
                  GUARDAR PESO
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

function EntryRow({ entry, onDelete, showDate = false }: { entry: FoodEntry, onDelete: () => void, showDate?: boolean }) {
  const statusIcon = {
    Bueno: "(^)",
    Moderado: "(=)",
    Evitar: "(x)",
  };

  return (
    <div className="p-4 border-4 border-[#0f380f] flex flex-col gap-2 relative bg-[#8bac0f] rounded-lg">
      <div className="flex items-start justify-between">
        <h3 className="font-bold text-xl uppercase truncate pr-8">{entry.name}</h3>
        <span className="font-black text-xl shrink-0">{statusIcon[entry.status]}</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {entry.mealType && (
          <span className="text-sm font-bold border-2 border-[#0f380f] px-2 py-0.5 rounded-full bg-[#9bbc0f]">
            {entry.mealType}
          </span>
        )}
        <span className="text-sm font-bold border-2 border-[#0f380f] px-2 py-0.5 rounded-full bg-[#9bbc0f]">
          {entry.status}
        </span>
      </div>
      
      <p className="text-lg leading-tight mt-1">{entry.reason}</p>
      
      <button 
        onClick={onDelete} 
        className="absolute top-2 right-2 font-black text-xl hover:text-red-600 px-2"
      >
        X
      </button>
    </div>
  );
}
