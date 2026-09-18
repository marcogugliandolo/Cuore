import { FoodStatus } from "./types";

export const classifyFood = async (food: string): Promise<{ status: FoodStatus, reason: string }> => {
  const hardcodedCheck = getHardcodedClassification(food.toLowerCase());
  if (hardcodedCheck) {
    return hardcodedCheck;
  }

  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ food })
  });
  if (!res.ok) throw new Error("Error al analizar el alimento.");
  return res.json();
}

export const scanLabel = async (file: File): Promise<{ status: FoodStatus, reason: string }> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/scan", {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Error al analizar la etiqueta.");
  return res.json();
}

export const scanAnalytics = async (file: File): Promise<{ triglycerides: number | null, cholesterol: number | null, notes: string }> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/analytics", {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Error al analizar la analítica médica.");
  return res.json();
}

function getHardcodedClassification(food: string): { status: FoodStatus, reason: string } | null {
  const buenos = ["nuez", "nueces", "pipas", "girasol", "aceitunas", "aguacate", "sardinas", "caballa", "huevo duro", "huevo", "yogur natural", "palomitas", "chocolate negro", "hummus", "crudites", "kale", "boniato"];
  const evitar = ["fruta desecada", "zumo", "jugo", "fritos", "chocapic", "alcohol", "maíz frito", "corn flakes", "azucar", "azúcar"];
  
  for (const b of buenos) {
    if (food.includes(b)) {
      return { status: "Bueno", reason: "Alimento identificado en la base de datos segura (grasas saludables/fibra)." };
    }
  }
  for (const e of evitar) {
    if (food.includes(e)) {
      return { status: "Evitar", reason: "Contiene componentes desaconsejados para triglicéridos altos (azúcar/fritos/refinados)." };
    }
  }
  return null;
}
