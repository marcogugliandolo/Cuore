import { useState } from "react";
import type { FormEvent } from "react";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Trash2, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, Sparkles, Info, RefreshCw, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { FoodEntry, AnalyticsEntry, WeightEntry, WeeklyAdviceResponse } from "../types";
import { classifyFood, getWeeklyFoodAnalysis } from "../api";
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
  const [foodAmount, setFoodAmount] = useState("");
  const [foodUnit, setFoodUnit] = useState<"gr" | "ml">("gr");
  const [mealType, setMealType] = useState<"Desayuno" | "Comida" | "Cena" | "Otro">("Comida");
  const [isAdding, setIsAdding] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [todayWeight, setTodayWeight] = useState("");
  const [confirmWeightDelete, setConfirmWeightDelete] = useState(false);
  const [showPastEntries, setShowPastEntries] = useState(false);

  // Entradas de los últimos 7 días
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyEntries = entries.filter((e) => e.timestamp >= oneWeekAgo);

  // Estado del consejero semanal IA
  const [weeklyAdvice, setWeeklyAdvice] = useState<WeeklyAdviceResponse | null>(() => {
    try {
      const saved = localStorage.getItem("cuore_weekly_advice");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [isAdviceOpen, setIsAdviceOpen] = useState(true);

  const todayEntries = entries.filter((e) => isToday(e.timestamp));
  const pastEntries = entries.filter((e) => !isToday(e.timestamp));

  const latestAnalytics = analyticsData.length > 0 ? analyticsData[analyticsData.length - 1] : null;
  const todayWeightEntry = weightData.find(w => w.date === format(new Date(), "yyyy-MM-dd"));

  const handleFetchWeeklyAdvice = async () => {
    setIsLoadingAdvice(true);
    setAdviceError(null);
    try {
      const latestWeightVal = weightData.length > 0 ? weightData[weightData.length - 1].weight : null;
      const advice = await getWeeklyFoodAnalysis({
        entries: weeklyEntries,
        latestAnalytics,
        latestWeight: latestWeightVal,
        user: currentUser,
      });
      setWeeklyAdvice(advice);
      setIsAdviceOpen(true);
      try {
        localStorage.setItem("cuore_weekly_advice", JSON.stringify(advice));
      } catch {}
    } catch (error: any) {
      console.error("Error al obtener análisis semanal:", error);
      setAdviceError(error?.message || "No se pudo generar el análisis. Reinténtalo.");
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const handleAddFood = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setIsAdding(true);
    setModalError(null);
    try {
      const calculatedPortion = foodAmount.trim() ? `${foodAmount.trim()} ${foodUnit}` : undefined;
      const { status, reason } = await classifyFood(newItem, calculatedPortion);
      onAddEntry({ 
        name: newItem.trim(), 
        portion: calculatedPortion,
        status, 
        reason, 
        mealType 
      });
      setNewItem("");
      setFoodAmount("");
      setFoodUnit("gr");
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

    // Impacto de comidas teniendo en cuenta la proporción:
    // Alimentos "Bueno" (omega-3, fibra, verdura): -2 a -3 mg/dL acumulativos
    // Alimentos "Evitar" (azúcar, ultraprocesados, grasas saturadas, alcohol): +4 mg/dL
    // Si la porción es grande o abundante, el impacto se multiplica x1.4; si es pequeña/media ración, x0.65
    let foodDelta = 0;
    const itemsToCalc = relevantEntries.length > 0 ? relevantEntries : entries;
    for (const item of itemsToCalc) {
      const p = (item.portion || "").toLowerCase();
      let mult = 1;
      const numMatch = p.match(/(\d+(?:\.\d+)?)\s*(gr|g|ml)?/);
      if (numMatch && numMatch[1]) {
        const val = parseFloat(numMatch[1]);
        if (val >= 250) mult = 1.4;
        else if (val <= 60) mult = 0.65;
      } else if (p.includes("grande") || p.includes("doble") || p.includes("mucho")) {
        mult = 1.4;
      } else if (p.includes("media") || p.includes("poco") || p.includes("puñado") || p.includes("cucharada")) {
        mult = 0.65;
      }

      if (item.status === "Evitar") {
        foodDelta += 4 * mult;
      } else if (item.status === "Bueno") {
        foodDelta -= 2.5 * mult;
      }
    }

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
        onClick={() => {
          setModalTab("comida");
          setIsModalOpen(true);
        }}
        className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-4 border-4 border-[#0f380f] rounded-xl active:bg-[#9bbc0f] active:text-[#0f380f] transition-colors shadow-md"
      >
        REGISTRAR
      </button>

      {/* SECCIÓN: ANÁLISIS SEMANAL IA & CONSEJOS PARA TRIGLICÉRIDOS (GEMINI) */}
      <section className="border-4 border-[#0f380f] bg-[#8bac0f]/30 rounded-xl p-4 md:p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 border-b-2 border-[#0f380f] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-[#0f380f] text-[#9bbc0f] rounded-lg flex items-center justify-center shrink-0">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide">
                  Consejero Semanal IA
                </h2>
                <span className="bg-[#0f380f] text-[#9bbc0f] text-[11px] md:text-xs font-bold uppercase px-2 py-0.5 rounded">
                  Gemini
                </span>
              </div>
              <p className="text-xs md:text-sm font-bold opacity-80 mt-0.5">
                Evaluación de comidas de los últimos 7 días ({weeklyEntries.length} registradas)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {weeklyAdvice && (
              <button
                onClick={() => setIsAdviceOpen(!isAdviceOpen)}
                className="p-1.5 border-2 border-[#0f380f] rounded hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors"
                title={isAdviceOpen ? "Plegar consejos" : "Desplegar consejos"}
              >
                {isAdviceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Action button if not yet analyzed or refresh */}
        {!weeklyAdvice && !isLoadingAdvice && (
          <div className="text-center py-4 space-y-3">
            <p className="text-base md:text-lg font-bold">
              {weeklyEntries.length === 0
                ? "Aún no tienes comidas registradas en los últimos 7 días. ¡Añade alimentos para que Gemini analice su impacto en tus triglicéridos!"
                : `Analiza ${weeklyEntries.length} comida(s) de tu semana para obtener un diagnóstico personalizado de reducción de triglicéridos.`}
            </p>
            <button
              onClick={handleFetchWeeklyAdvice}
              disabled={isLoadingAdvice}
              className="inline-flex items-center gap-2 bg-[#0f380f] text-[#9bbc0f] font-black text-lg md:text-xl px-5 py-2.5 border-2 border-[#0f380f] rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <Sparkles size={18} />
              <span>GENERAR ANÁLISIS SEMANAL</span>
            </button>
          </div>
        )}

        {isLoadingAdvice && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 size={32} className="animate-spin text-[#0f380f]" />
            <p className="text-lg md:text-xl font-black uppercase tracking-wider animate-pulse">
              Consultando a Gemini con tus comidas semanales...
            </p>
            <p className="text-xs md:text-sm font-bold opacity-75">
              Analizando perfil de grasas, azúcares simples y fibra para tus triglicéridos
            </p>
          </div>
        )}

        {adviceError && (
          <div className="bg-[#0f380f] text-[#9bbc0f] p-3 rounded-lg text-sm md:text-base font-bold flex items-center justify-between gap-2">
            <span>{adviceError}</span>
            <button
              onClick={handleFetchWeeklyAdvice}
              className="underline hover:text-white shrink-0 uppercase"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* RESULTS CARD */}
        {weeklyAdvice && !isLoadingAdvice && isAdviceOpen && (
          <div className="space-y-4 pt-1">
            {/* Header pill & Score */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#8bac0f] border-2 border-[#0f380f] p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold uppercase opacity-80">
                  Diagnóstico semanal:
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded text-xs md:text-sm font-black uppercase tracking-wide",
                  weeklyAdvice.score === "Excelente" && "bg-[#0f380f] text-[#9bbc0f]",
                  weeklyAdvice.score === "Favorable" && "bg-[#0f380f] text-[#9bbc0f]",
                  weeklyAdvice.score === "Atención" && "bg-[#0f380f] text-yellow-300",
                  weeklyAdvice.score === "Crítico" && "bg-rose-900 text-rose-100"
                )}>
                  {weeklyAdvice.score}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchWeeklyAdvice}
                  className="flex items-center gap-1 text-xs md:text-sm font-bold uppercase px-2 py-1 border border-[#0f380f] rounded hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors"
                  title="Actualizar consejos con nuevos registros"
                >
                  <RefreshCw size={12} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 bg-[#9bbc0f] border-2 border-[#0f380f] rounded-lg">
              <p className="text-base md:text-lg font-bold leading-snug">
                {weeklyAdvice.summary}
              </p>
            </div>

            {/* Grid of Strengths vs Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Strengths */}
              <div className="border-2 border-[#0f380f] bg-[#8bac0f]/40 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-sm md:text-base font-black uppercase text-[#0f380f]">
                  <CheckCircle2 size={16} strokeWidth={3} />
                  <span>Aciertos Cardiosaludables</span>
                </div>
                {weeklyAdvice.strengths.length === 0 ? (
                  <p className="text-xs md:text-sm font-bold opacity-75">Sin registros protectores destacados esta semana.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs md:text-sm font-bold">
                    {weeklyAdvice.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#0f380f] font-black">[+]</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Risks / To Fix */}
              <div className="border-2 border-[#0f380f] bg-[#8bac0f]/20 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-sm md:text-base font-black uppercase text-[#0f380f]">
                  <AlertTriangle size={16} strokeWidth={3} />
                  <span>Aspectos a Corregir</span>
                </div>
                {weeklyAdvice.risksToFix.length === 0 ? (
                  <p className="text-xs md:text-sm font-bold opacity-75">¡Sin alimentos nocivos registrados esta semana!</p>
                ) : (
                  <ul className="space-y-1.5 text-xs md:text-sm font-bold">
                    {weeklyAdvice.risksToFix.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#0f380f] font-black">[!]</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Personalized Actionable Tips */}
            <div className="border-2 border-[#0f380f] bg-[#9bbc0f] p-3.5 rounded-lg space-y-2.5">
              <div className="flex items-center gap-2 text-sm md:text-base font-black uppercase">
                <Lightbulb size={18} />
                <span>Consejos Personalizados para Bajar Triglicéridos</span>
              </div>
              <div className="space-y-2">
                {weeklyAdvice.keyPoints.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs md:text-sm font-bold bg-[#8bac0f]/40 p-2 rounded border border-[#0f380f]/40">
                    <span className="w-5 h-5 bg-[#0f380f] text-[#9bbc0f] rounded-full flex items-center justify-center shrink-0 text-xs font-black">
                      {idx + 1}
                    </span>
                    <p className="leading-snug">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Virtual Pet Bubble */}
            {weeklyAdvice.tamagotchiVerdict && (
              <div className="flex items-center gap-3 bg-[#0f380f] text-[#9bbc0f] p-3 rounded-xl border-2 border-[#0f380f]">
                <div className="text-xl md:text-2xl font-black shrink-0 tracking-tighter">
                  {weeklyAdvice.score === "Excelente" ? "( ^ _ ^ )" : weeklyAdvice.score === "Crítico" ? "( > _ < )" : "( = _ = )"}
                </div>
                <div className="text-xs md:text-sm font-bold uppercase leading-snug">
                  "{weeklyAdvice.tamagotchiVerdict}"
                </div>
              </div>
            )}

            {/* Footer timestamp */}
            {weeklyAdvice.generatedAt && (
              <div className="flex justify-between items-center text-[10px] md:text-xs font-bold opacity-70 px-1">
                <span>Último análisis generado: {format(new Date(weeklyAdvice.generatedAt), "dd/MM/yyyy HH:mm")}</span>
                <span>Modelo: Gemini</span>
              </div>
            )}
          </div>
        )}
      </section>

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
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
        >
          <div className="w-full max-w-md sm:max-w-lg bg-[#9bbc0f] border-4 sm:border-6 border-[#0f380f] rounded-2xl p-3.5 sm:p-5 shadow-2xl relative font-[VT323] text-[#0f380f] my-auto max-h-[94vh] flex flex-col">
            
            {/* Header del Modal con botón cerrar integrado */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#0f380f]/40 shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide">
                Nuevo Registro
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar ventana"
                className="w-8 h-8 flex items-center justify-center text-lg font-black border-2 border-[#0f380f] rounded-full hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="bg-[#0f380f] text-[#9bbc0f] p-2 text-center font-bold text-base sm:text-lg rounded-lg mb-3 animate-pulse">
                {modalError}
              </div>
            )}

            {/* Pestañas de Comida / Peso */}
            <div className="flex border-3 sm:border-4 border-[#0f380f] rounded-lg mb-3 overflow-hidden font-bold shrink-0">
              <button 
                type="button"
                onClick={() => setModalTab("comida")}
                className={cn("flex-1 py-1 sm:py-1.5 text-lg sm:text-xl transition-colors", modalTab === "comida" ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#8bac0f]")}
              >
                Comida
              </button>
              <div className="w-0.5 bg-[#0f380f]"></div>
              <button 
                type="button"
                onClick={() => setModalTab("peso")}
                className={cn("flex-1 py-1 sm:py-1.5 text-lg sm:text-xl transition-colors", modalTab === "peso" ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#8bac0f]")}
              >
                Peso
              </button>
            </div>

            {/* Contenido del formulario con botón GUARDAR fijo al pie */}
            <div className="flex-1 min-h-0 flex flex-col">
              {modalTab === "comida" && (
                <form onSubmit={handleAddFood} className="flex flex-col flex-1 min-h-0">
                  {/* Campos scrolleables si la pantalla es reducida */}
                  <div className="overflow-y-auto pr-1 flex-1 space-y-2.5">
                    <div>
                      <label className="block text-base sm:text-lg font-bold mb-0.5">¿Qué has comido?</label>
                      <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Ej: Nueces, Salmón con arroz, Pizza..."
                        className="w-full border-2 sm:border-3 border-[#0f380f] bg-transparent p-2 text-xl sm:text-2xl focus:outline-none placeholder-[#0f380f]/50 font-bold rounded"
                        disabled={isAdding}
                        autoFocus
                      />
                    </div>

                    {/* CANTIDAD: GRAMOS O ML */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-base sm:text-lg font-bold">Cantidad ({foodUnit === "gr" ? "Gramos" : "Mililitros"})</label>
                        <span className="text-[11px] font-bold uppercase opacity-80">
                          Opcional
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={foodAmount}
                          onChange={(e) => setFoodAmount(e.target.value)}
                          placeholder={`Ej: ${foodUnit === "gr" ? "150" : "250"}`}
                          className="flex-1 border-2 sm:border-3 border-[#0f380f] bg-transparent p-1.5 text-xl sm:text-2xl focus:outline-none placeholder-[#0f380f]/50 font-bold rounded"
                          disabled={isAdding}
                        />

                        {/* Selector de unidad: GR vs ML */}
                        <div className="flex border-2 sm:border-3 border-[#0f380f] rounded overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => setFoodUnit("gr")}
                            className={cn(
                              "px-3 py-1 text-lg sm:text-xl font-black transition-colors uppercase",
                              foodUnit === "gr" 
                                ? "bg-[#0f380f] text-[#9bbc0f]" 
                                : "bg-[#8bac0f]/40 hover:bg-[#8bac0f]"
                            )}
                          >
                            GR
                          </button>
                          <div className="w-0.5 bg-[#0f380f]" />
                          <button
                            type="button"
                            onClick={() => setFoodUnit("ml")}
                            className={cn(
                              "px-3 py-1 text-lg sm:text-xl font-black transition-colors uppercase",
                              foodUnit === "ml" 
                                ? "bg-[#0f380f] text-[#9bbc0f]" 
                                : "bg-[#8bac0f]/40 hover:bg-[#8bac0f]"
                          )}
                        >
                          ML
                        </button>
                      </div>
                    </div>

                    {/* Botones de sugerencias de cantidades comunes */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(foodUnit === "gr" 
                        ? ["30", "50", "100", "150", "200", "250"] 
                        : ["100", "150", "200", "250", "330", "500"]
                      ).map((val) => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setFoodAmount(val)}
                          className={cn(
                            "border-2 border-[#0f380f] px-2 py-0.5 text-xs sm:text-sm font-bold rounded transition-colors",
                            foodAmount === val ? "bg-[#0f380f] text-[#9bbc0f]" : "bg-[#9bbc0f]/60 hover:bg-[#8bac0f]"
                          )}
                        >
                          {val} {foodUnit}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Momento del día */}
                  <div>
                    <label className="block text-base sm:text-lg font-bold mb-0.5">Momento del día</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["Desayuno", "Comida", "Cena", "Otro"] as const).map(type => (
                        <button 
                          type="button" 
                          key={type} 
                          onClick={() => setMealType(type)}
                          className={cn(
                            "border-2 border-[#0f380f] py-1 text-base sm:text-lg font-bold transition-colors rounded", 
                            mealType === type ? "bg-[#0f380f] text-[#9bbc0f]" : "hover:bg-[#8bac0f]"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BOTÓN GUARDAR FIJO AL PIE (SIEMPRE VISIBLE) */}
                <div className="pt-3 mt-1 border-t-2 border-[#0f380f]/30 shrink-0">
                  <button
                    type="submit"
                    disabled={isAdding || !newItem.trim()}
                    className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-3 px-4 border-4 border-[#0f380f] rounded-xl disabled:opacity-50 active:scale-95 hover:bg-[#0f380f]/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 size={24} className="animate-spin" />
                        <span>ANALIZANDO...</span>
                      </>
                    ) : (
                      <span>GUARDAR COMIDA</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {modalTab === "peso" && (
              <form onSubmit={handleSaveWeight} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto pr-1 flex-1 space-y-3">
                  <div>
                    <label className="block text-lg font-bold mb-1">Peso actual (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={todayWeight}
                      onChange={(e) => setTodayWeight(e.target.value)}
                      placeholder="Ej: 75.5"
                      className="w-full border-3 border-[#0f380f] bg-transparent p-2.5 text-2xl focus:outline-none placeholder-[#0f380f]/50 font-bold rounded"
                      autoFocus
                    />
                  </div>
                </div>

                {/* BOTÓN GUARDAR PESO FIJO AL PIE */}
                <div className="pt-3 mt-1 border-t-2 border-[#0f380f]/30 shrink-0">
                  <button
                    type="submit"
                    disabled={!todayWeight}
                    className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-3 px-4 border-4 border-[#0f380f] rounded-xl disabled:opacity-50 active:scale-95 hover:bg-[#0f380f]/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    GUARDAR PESO
                  </button>
                </div>
              </form>
            )}
          </div>

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
      
      <div className="flex flex-wrap items-center gap-2">
        {entry.portion && (
          <span className="text-xs md:text-sm font-black border-2 border-[#0f380f] px-2.5 py-0.5 rounded-full bg-[#0f380f] text-[#9bbc0f] tracking-wide">
            ⚖️ {entry.portion}
          </span>
        )}
        {entry.mealType && (
          <span className="text-xs md:text-sm font-bold border-2 border-[#0f380f] px-2 py-0.5 rounded-full bg-[#9bbc0f]">
            {entry.mealType}
          </span>
        )}
        <span className="text-xs md:text-sm font-bold border-2 border-[#0f380f] px-2 py-0.5 rounded-full bg-[#9bbc0f]">
          {entry.status}
        </span>
      </div>
      
      <p className="text-lg leading-tight mt-1">{entry.reason}</p>
    </div>
  );
}
