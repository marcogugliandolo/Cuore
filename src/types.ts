export type FoodStatus = 'Bueno' | 'Moderado' | 'Evitar';

export interface FoodEntry {
  id: string;
  name: string;
  status: FoodStatus;
  reason: string;
  timestamp: number;
  mealType?: "Desayuno" | "Comida" | "Cena" | "Otro";
}

export interface AnalyticsEntry {
  id: string;
  date: string;
  triglycerides: number;
  cholesterol: number;
  notes: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export interface WeeklyAdviceResponse {
  score: "Excelente" | "Favorable" | "Atención" | "Crítico";
  summary: string;
  strengths: string[];
  risksToFix: string[];
  keyPoints: string[];
  tamagotchiVerdict: string;
  analyzedCount: number;
  generatedAt?: string;
}
