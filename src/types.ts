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
