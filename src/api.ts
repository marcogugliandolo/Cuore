import { FoodStatus, FoodEntry, AnalyticsEntry, WeeklyAdviceResponse } from "./types";

export const classifyFood = async (food: string, portion?: string): Promise<{ status: FoodStatus, reason: string }> => {
  if (!portion) {
    const hardcodedCheck = getHardcodedClassification(food.toLowerCase());
    if (hardcodedCheck) {
      return hardcodedCheck;
    }
  }

  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ food, portion: portion?.trim() || undefined })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "No se pudo clasificar el alimento. Inténtalo de nuevo.");
  }
  return data;
}

export const scanLabel = async (file: File): Promise<{ name?: string, status: FoodStatus, reason: string, suggestedPortion?: string }> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/scan", {
    method: "POST",
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "No se pudo analizar la etiqueta. Inténtalo de nuevo.");
  }
  return data;
}

export const scanAnalytics = async (file: File): Promise<{ triglycerides: number | null, cholesterol: number | null, notes: string }> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/analytics", {
    method: "POST",
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "No se pudo analizar la analítica médica. Inténtalo de nuevo.");
  }
  return data;
}

export const getWeeklyFoodAnalysis = async (payload: {
  entries: FoodEntry[];
  latestAnalytics?: AnalyticsEntry | null;
  latestWeight?: number | null;
  user?: string;
}): Promise<WeeklyAdviceResponse> => {
  const res = await fetch("/api/weekly-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "No se pudo obtener el análisis semanal de Gemini.");
  }
  return data;
};

function getHardcodedClassification(food: string): { status: FoodStatus, reason: string } | null {
  const buenos = ["nuez", "nueces", "pipas", "girasol", "aceitunas", "aguacate", "sardinas", "caballa", "huevo duro", "huevo", "yogur natural", "palomitas", "chocolate negro", "hummus", "crudites", "kale", "boniato", "avena", "salmon", "salmón", "aceite de oliva"];
  const evitar = ["fruta desecada", "zumo", "jugo", "fritos", "chocapic", "alcohol", "maíz frito", "corn flakes", "azucar", "azúcar", "bollería", "galletas", "refresco"];
  
  for (const b of buenos) {
    if (food.includes(b)) {
      return { status: "Bueno", reason: "Alimento cardiosaludable (grasas saludables/fibra para reducir triglicéridos)." };
    }
  }
  for (const e of evitar) {
    if (food.includes(e)) {
      return { status: "Evitar", reason: "Componentes desaconsejados para triglicéridos altos (azúcar/fritos/refinados)." };
    }
  }
  return null;
}
