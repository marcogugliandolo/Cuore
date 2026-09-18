import { useState } from "react";
import type { FormEvent } from "react";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Trash2, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, Sparkles, Info } from "lucide-react";
import { FoodEntry, AnalyticsEntry, WeightEntry } from "../types";
import { classifyFood } from "../api";
import { cn } from "../lib/utils";

interface DashboardProps {
  entries: FoodEntry[];
  onAddEntry: (entry: Omit<FoodEntry, "id" | "timestamp">) => void;
  onDeleteEntry: (id: string) => void;
  analyticsData: AnalyticsEntry[];
  weightData: WeightEntry[];
  onAddWeight: (entry: Omit<WeightEntry, "id">) => void;
  onDeleteWeight?: (id: string) => void;
  currentUser?: string;
}

export function Dashboard({ entries, onAddEntry, onDeleteEntry, analyticsData, weightData, onAddWeight, onDeleteWeight, currentUser = "Marco" }: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"comida" | "peso">("comida");
  
  const [newItem, setNewItem] = useState("");
  const [mealType, setMealType] = useState<"Desayuno" | "Comida" | "Cena" | "Otro">("Comida");
  const [isAdding, setIsAdding] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [todayWeight, setTodayWeight] = useState("");
  const [confirmWeightDelete, setConfirmWeightDelete] = useState(false);
  const [showPastEntries, setShowPastEntries] = useState(false);

  const todayEntries = entries.filter((e) => isToday(e.timestamp));
  const pastEntries = entries.filter((e) => !isToday(e.timestamp));

  const latestAnalytics = analyticsData.length > 0 ? analyticsData[analyticsData.length - 1] : null;
  const todayWeightEntry = weightData.find(w => w.date === format(new Date(), "yyyy-MM-dd"));

  const handleAddFood = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setIsAdding(true);
    setModalError(null);
    try {
      const { status, reason } = await classifyFood(newItem);
      onAddEntry({ name: newItem.trim(), status, reason, mealType });
      setNewItem("");
      setIsModalOpen(false);
    } catch (error: any) {
      setModalError(error?.message || "Error al analizar el alimento.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveWeight = (e: FormEvent) => {
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

  // Estimación predictiva de triglicéridos basada en:
  // 1) Valor de la última analítica real (base médica)
  // 2) Calidad de comidas registradas DESDE la fecha de la analítica
  // 3) Evolución del peso desde la fecha de la analítica
  const calculateTriglyceridesEstimate = () => {
    if (!latestAnalytics?.triglycerides) return null;
    const baseTrig = latestAnalytics.triglycerides;

    // Filtramos las comidas registradas desde la fecha de la analítica (o todas si no hay fecha válida)
    const analyticsTime = new Date(latestAnalytics.date).getTime() || 0;
    const relevantEntries = entries.filter(e => {
      if (!analyticsTime) return true;
      return e.timestamp >= analyticsTime;
    });

    const goodMeals = (relevantEntries.length > 0 ? relevantEntries : entries).filter(e => e.status === "Bueno").length;
    const avoidMeals = (relevantEntries.length > 0 ? relevantEntries : entries).filter(e => e.status === "Evitar").length;
    const moderateMeals = (relevantEntries.length > 0 ? relevantEntries : entries).filter(e => e.status === "Moderado").length;

    // Impacto de comidas:
    // Alimentos "Bueno" (omega-3, fibra, verdura): -2 a -3 mg/dL acumulativos
    // Alimentos "Evitar" (azúcar, ultraprocesados, grasas saturadas, alcohol): +4 mg/dL
    const foodDelta = (avoidMeals * 4) - (goodMeals * 2.5);

    // Delta de peso en relación al peso inicial
    let weightDelta = 0;
    let initialWeight: number | null = null;
    let currentWeight: number | null = null;

    if (weightData.length >= 1) {
      initialWeight = weightData[0].weight;
      currentWeight = weightData[weightData.length - 1].weight;
      if (weightData.length >= 2) {
        const diff = currentWeight - initialWeight;
        // La literatura médica estima que cada 1 kg de reducción de peso reduce entre 5 y 8 mg/dL de triglicéridos
        weightDelta = diff * 7;
      }
    }

    const estimated = Math.max(45, Math.round(baseTrig + foodDelta + weightDelta));
    const difference = estimated - baseTrig;

    let trend: "improving" | "worsening" | "stable" = "stable";
    if (difference <= -2) trend = "improving";
    else if (difference >= 2) trend = "worsening";

    // Clasificación médica según ATP III / Guías cardiovasculares:
    // Normal: < 150 mg/dL
    // Límite alto / Elevado: 150 - 199 mg/dL
    // Alto: 200 - 499 mg/dL
    // Muy alto: >= 500 mg/dL
    const getRiskLevel = (val: number) => {
      if (val < 150) return { label: "NORMAL (<150)", color: "text-[#0f380f]" };
      if (val < 200) return { label: "LÍMITE ALTO (150-199)", color: "text-[#0f380f]" };
      if (val < 500) return { label: "ELEVADO (>200)", color: "text-[#0f380f]" };
      return { label: "MUY ELEVADO (≥500)", color: "text-[#0f380f]" };
    };

    return {
      base: baseTrig,
      date: latestAnalytics.date,
      estimated,
      difference,
      trend,
      goodMeals,
      avoidMeals,
      moderateMeals,
      totalMeals: relevantEntries.length,
      baseRisk: getRiskLevel(baseTrig),
      estimatedRisk: getRiskLevel(estimated),
    };
  };

  const trigEstimate = calculateTriglyceridesEstimate();

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <header className="border-b-4 border-[#0f380f] pb-4">
        <h1 className="text-4xl font-bold tracking-tight uppercase">HOLA {currentUser}</h1>
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
      <section className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 items-stretch">
        {/* TARJETA TRIGLICÉRIDOS */}
        <div className="border-4 border-[#0f380f] p-3.5 md:p-4 rounded-xl bg-[#8bac0f]/40 space-y-3 flex flex-col justify-between">
          {/* Fila superior: Título y Fecha */}
          <div className="flex items-center justify-between border-b-2 border-[#0f380f]/20 pb-1.5">
            <span className="text-base md:text-lg font-bold uppercase tracking-wider">Triglicéridos</span>
            {latestAnalytics ? (
              <span className="text-xs md:text-sm font-bold opacity-80">
                Última analítica: {latestAnalytics.date}
              </span>
            ) : (
              <span className="text-xs md:text-sm font-bold opacity-60">Sin analítica</span>
            )}
          </div>

          {/* Fila central: Datos de analítica vs estimado */}
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Analítica real */}
            <div className="border-r-2 border-[#0f380f]/30 pr-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black leading-none">
                  {latestAnalytics?.triglycerides ? latestAnalytics.triglycerides : "---"}
                </span>
                <span className="text-xs font-bold opacity-75">mg/dL</span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-tight opacity-75 mt-1">
                Analítica Real
              </p>
              {trigEstimate?.baseRisk && (
                <span className="inline-block mt-1 text-[10px] font-black px-1 py-0.5 rounded bg-[#0f380f] text-[#9bbc0f]">
                  {trigEstimate.baseRisk.label}
                </span>
              )}
            </div>

            {/* Estimado actual */}
            <div className="pl-1">
              {trigEstimate ? (
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-3xl font-black leading-none">
                      ~{trigEstimate.estimated}
                    </span>
                    {trigEstimate.trend === "improving" && (
                      <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-[#0f380f] text-[#9bbc0f] inline-flex items-center whitespace-nowrap">
                        <TrendingDown size={11} className="mr-0.5" />
                        {trigEstimate.difference}
                      </span>
                    )}
                    {trigEstimate.trend === "worsening" && (
                      <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-[#0f380f] text-[#9bbc0f] inline-flex items-center whitespace-nowrap">
                        <TrendingUp size={11} className="mr-0.5" />
                        +{trigEstimate.difference}
                      </span>
                    )}
                    {trigEstimate.trend === "stable" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#0f380f] uppercase whitespace-nowrap opacity-85" title="Sin variación respecto a la analítica">
                        ±0 mg/dL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-tight opacity-75 mt-1">
                    Estimado Hoy
                  </p>
                  {trigEstimate.estimatedRisk && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-1 py-0.5 rounded bg-[#0f380f] text-[#9bbc0f]">
                      {trigEstimate.estimatedRisk.label}
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-2xl font-black opacity-50">---</span>
                  <p className="text-[11px] font-bold uppercase tracking-tight opacity-50 mt-1">
                    Sin estimación
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fila inferior: Mensaje explicativo y desglose */}
          <div className="pt-2 border-t-2 border-[#0f380f]/20 space-y-1.5">
            {trigEstimate ? (
              <>
                <p className="text-xs font-bold leading-tight">
                  {trigEstimate.trend === "improving" && (
                    <span className="text-[#0f380f]">
                      ✓ ¡Mejorando! Tus comidas saludables y peso proyectan una bajada de {Math.abs(trigEstimate.difference)} mg/dL.
                    </span>
                  )}
                  {trigEstimate.trend === "worsening" && (
                    <span className="text-[#0f380f]">
                      ▲ Cuidado: alimentos a evitar o subida de peso proyectan +{trigEstimate.difference} mg/dL.
                    </span>
                  )}
                  {trigEstimate.trend === "stable" && (
                    <span className="text-[#0f380f] opacity-90">
                      • Base médica: {trigEstimate.base} mg/dL (ELEVADO). Aún sin variación registrada desde la analítica.
                    </span>
                  )}
                </p>
                
                {/* Resumen dinámico de impacto */}
                <div className="flex items-center gap-3 text-[11px] font-bold opacity-80 pt-0.5">
                  <span>Comidas: {trigEstimate.goodMeals} Buenas / {trigEstimate.avoidMeals} Evitar</span>
                  {weightData.length >= 2 && (
                    <span>
                      Peso: {(weightData[weightData.length - 1].weight - weightData[0].weight) > 0 ? "+" : ""}
                      {(weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1)} kg
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs font-bold opacity-75 leading-tight">
                Registra tu analítica en Informes para ver tu proyección inteligente.
              </p>
            )}
          </div>
        </div>

        {/* TARJETA PESO */}
        <div className="border-4 border-[#0f380f] p-3.5 md:p-4 rounded-xl bg-[#8bac0f]/40 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-[#0f380f]/20 pb-1.5">
              <span className="text-base md:text-lg font-bold uppercase tracking-wider">Peso de Hoy</span>
              {todayWeightEntry && onDeleteWeight && (
                confirmWeightDelete ? (
                  <div className="flex items-center gap-1 bg-[#0f380f] text-[#9bbc0f] px-2 py-0.5 rounded text-xs">
                    <span>¿Borrar?</span>
                    <button
                      onClick={() => {
                        onDeleteWeight(todayWeightEntry.id);
                        setConfirmWeightDelete(false);
                      }}
                      className="font-black text-[#9bbc0f] underline ml-1"
                    >
                      SÍ
                    </button>
                    <span>/</span>
                    <button
                      onClick={() => setConfirmWeightDelete(false)}
                      className="font-bold text-[#9bbc0f] hover:underline"
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmWeightDelete(true)}
                    className="border border-[#0f380f] hover:bg-[#0f380f] hover:text-[#9bbc0f] px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Eliminar registro de peso de hoy"
                  >
                    <Trash2 size={11} /> BORRAR
                  </button>
                )
              )}
            </div>

            <div className="flex items-baseline justify-between pt-2">
              <div>
                <span className="text-3xl md:text-4xl font-black">
                  {todayWeightEntry?.weight ? `${todayWeightEntry.weight} kg` : "--- kg"}
                </span>
                <p className="text-[11px] md:text-xs font-bold uppercase tracking-tight opacity-75 mt-0.5">
                  {todayWeightEntry ? "Registrado hoy" : "Sin registrar hoy"}
                </p>
              </div>
              {!todayWeightEntry && (
                <button
                  onClick={() => {
                    setModalTab("peso");
                    setIsModalOpen(true);
                  }}
                  className="text-xs md:text-sm font-bold uppercase px-2.5 py-1.5 border-2 border-[#0f380f] rounded hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors"
                >
                  + Añadir Peso
                </button>
              )}
            </div>
          </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold uppercase">Registro de Hoy</h2>
          <span className="text-sm font-bold opacity-75">{todayEntries.length} comida{todayEntries.length === 1 ? "" : "s"}</span>
        </div>
        
        {todayEntries.length === 0 ? (
          <p className="text-xl text-center py-4 border-2 border-dashed border-[#0f380f]">Vacio...</p>
        ) : (
          <div className="space-y-3">
            {todayEntries.map(entry => (
              <EntryRow key={entry.id} entry={entry} onDelete={() => onDeleteEntry(entry.id)} />
            ))}
          </div>
        )}

        {/* PAST ENTRIES TOGGLE */}
        {pastEntries.length > 0 && (
          <div className="pt-4 border-t-2 border-dashed border-[#0f380f]">
            <button
              onClick={() => setShowPastEntries(!showPastEntries)}
              className="w-full flex items-center justify-between p-3 border-2 border-[#0f380f] rounded-lg font-bold text-lg hover:bg-[#8bac0f] transition-colors"
            >
              <span>DÍAS ANTERIORES ({pastEntries.length})</span>
              {showPastEntries ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {showPastEntries && (
              <div className="mt-3 space-y-3">
                {pastEntries.map(entry => (
                  <EntryRow 
                    key={entry.id} 
                    entry={entry} 
                    onDelete={() => onDeleteEntry(entry.id)} 
                    showDate={true} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* MODAL (POPUP) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md md:max-w-lg bg-[#9bbc0f] border-8 border-[#0f380f] rounded-2xl p-6 md:p-8 shadow-2xl relative font-[VT323] text-[#0f380f]">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-2xl font-black w-10 h-10 flex justify-center items-center hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors rounded-full"
            >
              X
            </button>

            <h2 className="text-3xl font-bold mb-6 text-center uppercase">Nuevo Registro</h2>

            {modalError && (
              <div className="bg-[#0f380f] text-[#9bbc0f] p-2 text-center font-bold text-lg rounded-lg mb-4 animate-pulse">
                {modalError}
              </div>
            )}

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

function EntryRow({ entry, onDelete, showDate = false }: { entry: FoodEntry; onDelete: () => void; showDate?: boolean; key?: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const statusIcon = {
    Bueno: "(^)",
    Moderado: "(=)",
    Evitar: "(x)",
  };

  return (
    <div className="p-4 border-4 border-[#0f380f] flex flex-col gap-2 relative bg-[#8bac0f] rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="font-bold text-xl uppercase truncate">{entry.name}</h3>
          {showDate && (
            <p className="text-sm font-bold opacity-75">
              {format(entry.timestamp, "dd/MM/yyyy HH:mm")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-black text-xl">{statusIcon[entry.status]}</span>
          {isConfirming ? (
            <div className="flex items-center gap-1.5 bg-[#0f380f] text-[#9bbc0f] px-2 py-1 rounded text-xs">
              <span className="font-bold">¿Borrar?</span>
              <button 
                onClick={onDelete}
                className="bg-[#9bbc0f] text-[#0f380f] px-1.5 py-0.5 rounded font-black hover:bg-white"
                title="Confirmar borrar"
              >
                SÍ
              </button>
              <button 
                onClick={() => setIsConfirming(false)}
                className="border border-[#9bbc0f] px-1.5 py-0.5 rounded font-bold hover:bg-[#8bac0f]"
                title="Cancelar"
              >
                NO
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsConfirming(true)} 
              className="border-2 border-[#0f380f] hover:bg-[#0f380f] hover:text-[#9bbc0f] p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
              title="Eliminar este alimento"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">BORRAR</span>
            </button>
          )}
        </div>
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
    </div>
  );
}
