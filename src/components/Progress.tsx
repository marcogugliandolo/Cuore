import { useState, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Upload, Loader2, Trash2, ChevronDown, ChevronUp, HardDrive, CheckCircle2, Download, Plus, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AnalyticsEntry, WeightEntry } from "../types";
import { scanAnalytics } from "../api";

interface ProgressProps {
  analyticsData: AnalyticsEntry[];
  weightData: WeightEntry[];
  onAddAnalytics: (e: Omit<AnalyticsEntry, "id">) => void;
  onAddWeight: (e: Omit<WeightEntry, "id">) => void;
  onDeleteAnalytics?: (id: string) => void;
  onDeleteWeight?: (id: string) => void;
}

export function Progress({ 
  analyticsData, 
  weightData, 
  onAddAnalytics, 
  onAddWeight,
  onDeleteAnalytics,
  onDeleteWeight 
}: ProgressProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showManualAnalytics, setShowManualAnalytics] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualTG, setManualTG] = useState("");
  const [manualCol, setManualCol] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualAnalyticsSubmit = (e: FormEvent) => {
    e.preventDefault();
    const tg = parseFloat(manualTG);
    if (isNaN(tg) || tg <= 0) {
      setStatusMessage({ text: "Introduce un valor válido de triglicéridos.", isError: true });
      return;
    }
    const col = manualCol ? parseFloat(manualCol) : 0;

    onAddAnalytics({
      date: manualDate || format(new Date(), "yyyy-MM-dd"),
      triglycerides: tg,
      cholesterol: isNaN(col) ? 0 : col,
      notes: manualNotes.trim() || "Entrada manual",
    });

    setManualTG("");
    setManualCol("");
    setManualNotes("");
    setShowManualAnalytics(false);
    setStatusMessage({ text: "¡Analítica guardada correctamente!", isError: false });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Comprobar estado de guardado en el servidor
  const verifyServerStorage = async () => {
    setIsSavingServer(true);
    try {
      const res = await fetch("/api/data");
      if (res.ok) {
        const data = await res.json();
        const msg = `Volumen Docker OK (${data.entries?.length || 0} comidas, ${data.analyticsData?.length || 0} analíticas, ${data.weightData?.length || 0} pesos)`;
        setServerStatus(msg);
      } else {
        setServerStatus("Error al conectar con el servidor");
      }
    } catch {
      setServerStatus("Servidor no accesible");
    } finally {
      setIsSavingServer(false);
      setTimeout(() => setServerStatus(null), 5000);
    }
  };

  const downloadBackup = () => {
    const backup = {
      entries: JSON.parse(localStorage.getItem("modo_sano_entries") || "[]"),
      analyticsData,
      weightData,
      user: localStorage.getItem("cuore_user") || "Marco",
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuore_backup_${format(new Date(), "yyyyMMdd_HHmm")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await scanAnalytics(file);
      onAddAnalytics({
        date: format(new Date(), "yyyy-MM-dd"),
        triglycerides: res.triglycerides || 0,
        cholesterol: res.cholesterol || 0,
        notes: res.notes || "Análisis completado",
      });
      setStatusMessage({ text: "¡Analítica guardada con éxito!", isError: false });
    } catch (error: any) {
      setStatusMessage({ text: error?.message || "Error al analizar la imagen.", isError: true });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const weightChartData = weightData.map(d => ({ ...d, displayDate: format(parseISO(d.date), "dd MMM", { locale: es }) }));
  const analyticsChartData = analyticsData.map(d => ({ ...d, displayDate: format(parseISO(d.date), "MMM yyyy", { locale: es }) }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#9bbc0f] border-4 border-[#0f380f] p-2 text-[#0f380f] font-[VT323]">
          <p className="font-bold">{label}</p>
          <p className="font-black text-xl">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <header className="border-b-4 border-[#0f380f] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">INFORMES</h1>
          <p className="text-xs font-bold opacity-75">Sube tus analíticas médicas o revisa el estado del volumen</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón Comprobar / Sincronizar con Volumen Docker */}
          <button
            onClick={verifyServerStorage}
            disabled={isSavingServer}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-[#0f380f] bg-[#8bac0f] hover:bg-[#0f380f] hover:text-[#9bbc0f] text-xs font-bold uppercase rounded-lg transition-colors"
            title="Comprobar persistencia en volumen Docker"
          >
            {isSavingServer ? <Loader2 size={16} className="animate-spin" /> : <HardDrive size={16} />}
            <span>Volumen</span>
          </button>

          {/* Botón Descargar Copia JSON de seguridad */}
          <button
            onClick={downloadBackup}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-[#0f380f] bg-[#8bac0f] hover:bg-[#0f380f] hover:text-[#9bbc0f] text-xs font-bold uppercase rounded-lg transition-colors"
            title="Descargar copia de seguridad en JSON"
          >
            <Download size={16} />
            <span>Backup</span>
          </button>

          {/* Botón Subir Analítica */}
          <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center w-10 h-10 bg-[#0f380f] text-[#9bbc0f] rounded-lg font-bold transition-colors disabled:opacity-50 ml-1"
            title="Escanear informe o analítica con IA"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} strokeWidth={3} />}
          </button>

          {/* Botón Añadir Analítica Manualmente */}
          <button
            onClick={() => setShowManualAnalytics(!showManualAnalytics)}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-[#0f380f] bg-[#0f380f] text-[#9bbc0f] hover:bg-[#8bac0f] hover:text-[#0f380f] text-xs font-bold uppercase rounded-lg transition-colors ml-1"
            title="Añadir datos de analítica manualmente"
          >
            {showManualAnalytics ? <X size={16} /> : <Plus size={16} />}
            <span>{showManualAnalytics ? "Cerrar" : "+ Analítica"}</span>
          </button>
        </div>
      </header>

      {/* Formulario desplegable para introducir analítica manualmente */}
      {showManualAnalytics && (
        <form 
          onSubmit={handleManualAnalyticsSubmit}
          className="p-4 bg-[#8bac0f] border-4 border-[#0f380f] rounded-xl space-y-3"
        >
          <div className="flex justify-between items-center border-b-2 border-[#0f380f] pb-2">
            <h3 className="text-xl font-bold uppercase tracking-tight">NUEVA ANALÍTICA MANUAL</h3>
            <button
              type="button"
              onClick={() => setShowManualAnalytics(false)}
              className="p-1 hover:bg-[#0f380f] hover:text-[#9bbc0f] rounded"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
                className="w-full bg-[#9bbc0f] border-2 border-[#0f380f] p-2 rounded text-[#0f380f] font-bold text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Triglicéridos (mg/dL) *</label>
              <input
                type="number"
                step="1"
                placeholder="Ej: 231"
                value={manualTG}
                onChange={(e) => setManualTG(e.target.value)}
                required
                className="w-full bg-[#9bbc0f] border-2 border-[#0f380f] p-2 rounded text-[#0f380f] font-black text-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Colesterol Total (mg/dL)</label>
              <input
                type="number"
                step="1"
                placeholder="Ej: 195 (opcional)"
                value={manualCol}
                onChange={(e) => setManualCol(e.target.value)}
                className="w-full bg-[#9bbc0f] border-2 border-[#0f380f] p-2 rounded text-[#0f380f] font-bold text-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Notas u Observaciones (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Análisis de sangre en ayunas - Centro de salud"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              className="w-full bg-[#9bbc0f] border-2 border-[#0f380f] p-2 rounded text-[#0f380f] font-medium text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowManualAnalytics(false)}
              className="px-3 py-1.5 border-2 border-[#0f380f] bg-transparent hover:bg-[#0f380f] hover:text-[#9bbc0f] text-xs font-bold uppercase rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 border-2 border-[#0f380f] bg-[#0f380f] text-[#9bbc0f] hover:bg-[#9bbc0f] hover:text-[#0f380f] text-xs font-bold uppercase rounded shadow"
            >
              Guardar Analítica
            </button>
          </div>
        </form>
      )}

      {/* Notificación de estado del servidor/volumen */}
      {serverStatus && (
        <div className="p-2.5 text-center font-bold text-sm rounded-lg bg-[#0f380f] text-[#9bbc0f] flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          <span>{serverStatus}</span>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3 text-center font-bold text-lg rounded-xl ${
            statusMessage.isError
              ? "bg-[#0f380f] text-[#9bbc0f] animate-pulse"
              : "border-4 border-[#0f380f] bg-[#9bbc0f] text-[#0f380f]"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Gráficos de Peso y Analíticas en tablets */}
      <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 items-start">
        {/* Peso */}
        <section className="bg-[#8bac0f] p-4 md:p-5 rounded-xl border-4 border-[#0f380f] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl md:text-2xl font-bold uppercase">PESO (kg)</h3>
            {weightData.length > 0 && (
              <button
                onClick={() => setShowWeightHistory(!showWeightHistory)}
                className="text-xs md:text-sm font-bold border-2 border-[#0f380f] px-2.5 py-1 rounded bg-[#9bbc0f] hover:bg-[#0f380f] hover:text-[#9bbc0f] transition-colors flex items-center gap-1"
              >
                <span>{showWeightHistory ? "Ocultar lista" : `Ver lista (${weightData.length})`}</span>
                {showWeightHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          {weightData.length === 0 ? (
            <p className="text-xl font-medium py-12 text-center opacity-70">SIN DATOS DE PESO</p>
          ) : (
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightChartData} margin={{ top: 10, right: 0, bottom: 0, left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0f380f" opacity={0.3} />
                  <XAxis dataKey="displayDate" axisLine={{ stroke: '#0f380f', strokeWidth: 3 }} tickLine={{ stroke: '#0f380f', strokeWidth: 3 }} tick={{ fill: '#0f380f', fontSize: 16, fontFamily: 'VT323', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#0f380f', fontSize: 16, fontFamily: 'VT323', fontWeight: 'bold' }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="step" dataKey="weight" stroke="#0f380f" strokeWidth={4} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Historial de pesos con opción de eliminar */}
          {showWeightHistory && weightData.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-[#0f380f] space-y-2">
              <h4 className="font-bold text-lg uppercase mb-2">Registros de Peso</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {weightData.slice().reverse().map(w => (
                  <WeightItem 
                    key={w.id} 
                    entry={w} 
                    onDelete={() => onDeleteWeight?.(w.id)} 
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Analíticas */}
        <section className="bg-[#8bac0f] p-4 md:p-5 rounded-xl border-4 border-[#0f380f]">
          <h3 className="text-xl md:text-2xl font-bold uppercase mb-4">TRIGLICÉRIDOS</h3>
          {analyticsData.length === 0 ? (
            <p className="text-xl font-medium py-12 text-center opacity-70">SUBE ANALÍTICA O AÑADE MANUAL</p>
          ) : (
            <>
              <div className="h-64 md:h-72 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsChartData} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0f380f" opacity={0.3} />
                    <XAxis dataKey="displayDate" axisLine={{ stroke: '#0f380f', strokeWidth: 3 }} tickLine={{ stroke: '#0f380f', strokeWidth: 3 }} tick={{ fill: '#0f380f', fontSize: 16, fontFamily: 'VT323', fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#0f380f', fontSize: 16, fontFamily: 'VT323', fontWeight: 'bold' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={150} stroke="#0f380f" strokeDasharray="5 5" label={{ position: 'top', value: 'MAX 150', fill: '#0f380f', fontSize: 16, fontFamily: 'VT323', fontWeight: 'bold' }} />
                    <Area type="stepAfter" dataKey="triglycerides" stroke="#0f380f" strokeWidth={4} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b-2 border-[#0f380f] pb-2">
                  <h4 className="font-bold text-xl uppercase">INFORMES GUARDADOS</h4>
                  <span className="text-sm font-bold opacity-75">{analyticsData.length} informe{analyticsData.length === 1 ? "" : "s"}</span>
                </div>

                {analyticsData.slice().reverse().map(a => (
                  <AnalyticsItem 
                    key={a.id} 
                    entry={a} 
                    onDelete={() => onDeleteAnalytics?.(a.id)} 
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function WeightItem({ entry, onDelete }: { entry: WeightEntry; onDelete: () => void; key?: string }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div className="flex items-center justify-between p-2 bg-[#9bbc0f] border-2 border-[#0f380f] rounded-lg">
      <span className="font-bold">{format(parseISO(entry.date), "dd/MM/yyyy")}</span>
      <div className="flex items-center gap-3">
        <span className="font-black text-xl">{entry.weight} kg</span>
        {isConfirming ? (
          <div className="flex items-center gap-1 bg-[#0f380f] text-[#9bbc0f] px-1.5 py-0.5 rounded text-xs">
            <span>¿Borrar?</span>
            <button 
              onClick={onDelete} 
              className="bg-[#9bbc0f] text-[#0f380f] px-1 py-0.2 rounded font-black hover:bg-white"
            >
              SÍ
            </button>
            <button 
              onClick={() => setIsConfirming(false)} 
              className="border border-[#9bbc0f] px-1 py-0.2 rounded font-bold"
            >
              NO
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsConfirming(true)}
            className="p-1 border border-[#0f380f] hover:bg-[#0f380f] hover:text-[#9bbc0f] rounded transition-colors"
            title="Eliminar este peso"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function AnalyticsItem({ entry, onDelete }: { entry: AnalyticsEntry; onDelete: () => void; key?: string }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div className="p-3 border-4 border-[#0f380f] rounded-lg bg-[#9bbc0f]/60 relative">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg">{format(parseISO(entry.date), "dd/MM/yyyy")}</span>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-sm font-bold">
            <span>TG: <strong className="text-xl">{entry.triglycerides}</strong></span>
            <span>COL: <strong className="text-xl">{entry.cholesterol}</strong></span>
          </div>
          {isConfirming ? (
            <div className="flex items-center gap-1 bg-[#0f380f] text-[#9bbc0f] px-2 py-0.5 rounded text-xs font-bold">
              <span>¿Borrar?</span>
              <button 
                onClick={onDelete} 
                className="bg-[#9bbc0f] text-[#0f380f] px-1.5 py-0.2 rounded font-black hover:bg-white"
              >
                SÍ
              </button>
              <button 
                onClick={() => setIsConfirming(false)} 
                className="border border-[#9bbc0f] px-1.5 py-0.2 rounded font-bold"
              >
                NO
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsConfirming(true)}
              className="border-2 border-[#0f380f] hover:bg-[#0f380f] hover:text-[#9bbc0f] p-1.5 rounded transition-colors text-xs font-bold flex items-center gap-1"
              title="Eliminar esta analítica"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">BORRAR</span>
            </button>
          )}
        </div>
      </div>
      <p className="text-lg leading-tight">{entry.notes}</p>
    </div>
  );
}
