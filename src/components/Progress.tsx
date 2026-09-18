import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Upload, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AnalyticsEntry, WeightEntry } from "../types";
import { scanAnalytics } from "../api";

interface ProgressProps {
  analyticsData: AnalyticsEntry[];
  weightData: WeightEntry[];
  onAddAnalytics: (e: Omit<AnalyticsEntry, "id">) => void;
  onAddWeight: (e: Omit<WeightEntry, "id">) => void;
}

export function Progress({ analyticsData, weightData, onAddAnalytics, onAddWeight }: ProgressProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await scanAnalytics(file);
      onAddAnalytics({
        date: format(new Date(), "yyyy-MM-dd"),
        triglycerides: res.triglycerides || 0,
        cholesterol: res.cholesterol || 0,
        notes: res.notes || "Análisis completado",
      });
      alert("Analítica analizada y guardada con éxito.");
    } catch (error) {
      alert("Error al analizar la imagen.");
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
      <header className="border-b-4 border-[#0f380f] pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">STATS</h1>
        </div>
        <div>
          <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center w-12 h-12 bg-[#0f380f] text-[#9bbc0f] rounded-lg font-bold transition-colors disabled:opacity-50"
            title="Subir Analítica"
          >
            {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} strokeWidth={3} />}
          </button>
        </div>
      </header>

      {/* Peso */}
      <section className="bg-[#8bac0f] p-4 rounded-xl border-4 border-[#0f380f]">
        <h3 className="text-xl font-bold uppercase mb-4">PESO (kg)</h3>
        {weightData.length === 0 ? (
          <p className="text-xl font-medium">SIN DATOS</p>
        ) : (
          <div className="h-64 w-full">
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
      </section>

      {/* Analíticas */}
      <section className="bg-[#8bac0f] p-4 rounded-xl border-4 border-[#0f380f]">
        <h3 className="text-xl font-bold uppercase mb-4">TRIGLICÉRIDOS</h3>
        {analyticsData.length === 0 ? (
          <p className="text-xl font-medium">SUBE ANALÍTICA</p>
        ) : (
          <>
            <div className="h-64 w-full mb-6">
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
              <h4 className="font-bold text-xl border-b-2 border-[#0f380f] pb-2">INFORMES</h4>
              {analyticsData.slice().reverse().map(a => (
                <div key={a.id} className="p-3 border-4 border-[#0f380f] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{format(parseISO(a.date), "dd/MM/yy")}</span>
                    <div className="flex gap-4 text-sm font-bold">
                      <span>TG: <strong className="text-xl">{a.triglycerides}</strong></span>
                      <span>COL: <strong className="text-xl">{a.cholesterol}</strong></span>
                    </div>
                  </div>
                  <p className="text-lg leading-tight">{a.notes}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
