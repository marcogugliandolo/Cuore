import { useState, useEffect, useRef } from "react";
import { Login } from "./components/Login";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { SearchScanner } from "./components/SearchScanner";
import { Progress } from "./components/Progress";
import { FoodEntry, AnalyticsEntry, WeightEntry } from "./types";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("modo_sano_auth") === "true";
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem("cuore_user") || "Marco";
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "search" | "progress">("dashboard");

  const [entries, setEntries] = useState<FoodEntry[]>(() => {
    const saved = localStorage.getItem("modo_sano_entries");
    return saved ? JSON.parse(saved) : [];
  });

  const [analyticsData, setAnalyticsData] = useState<AnalyticsEntry[]>(() => {
    const saved = localStorage.getItem("cuore_analytics");
    return saved ? JSON.parse(saved) : [];
  });

  const [weightData, setWeightData] = useState<WeightEntry[]>(() => {
    const saved = localStorage.getItem("cuore_weight");
    return saved ? JSON.parse(saved) : [];
  });

  // Track if initial fetch from backend completed so we don't overwrite server data with empty state
  const isServerLoaded = useRef(false);

  // 1. Cargar datos desde el backend (volumen /app/data en Docker) al iniciar
  useEffect(() => {
    async function loadServerData() {
      try {
        const res = await fetch("/api/data");
        if (res.ok) {
          const serverData = await res.json();
          if (serverData && (serverData.entries || serverData.analyticsData || serverData.weightData)) {
            // Si el servidor tiene datos, priorizamos los del servidor o los combinamos con lo local
            if (serverData.entries && serverData.entries.length > 0) {
              setEntries(serverData.entries);
            }
            if (serverData.analyticsData && serverData.analyticsData.length > 0) {
              setAnalyticsData(serverData.analyticsData);
            }
            if (serverData.weightData && serverData.weightData.length > 0) {
              setWeightData(serverData.weightData);
            }
            if (serverData.user) {
              setCurrentUser(serverData.user);
            }
          }
        }
      } catch (err) {
        console.warn("Could not sync with /api/data on startup:", err);
      } finally {
        isServerLoaded.current = true;
      }
    }

    loadServerData();
  }, []);

  // 2. Guardar en localStorage de forma instantánea
  useEffect(() => {
    localStorage.setItem("modo_sano_entries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("cuore_analytics", JSON.stringify(analyticsData));
  }, [analyticsData]);

  useEffect(() => {
    localStorage.setItem("cuore_weight", JSON.stringify(weightData));
  }, [weightData]);

  // 3. Sincronizar y persistir automáticamente en el servidor (/app/data en Docker)
  useEffect(() => {
    if (!isServerLoaded.current) return;

    const timer = setTimeout(async () => {
      try {
        await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries,
            analyticsData,
            weightData,
            user: currentUser,
          }),
        });
      } catch (e) {
        console.error("Error saving data to /api/data:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [entries, analyticsData, weightData, currentUser]);

  const handleLogin = (user: string) => {
    localStorage.setItem("modo_sano_auth", "true");
    localStorage.setItem("cuore_user", user);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("modo_sano_auth");
    setIsAuthenticated(false);
  };

  const addEntry = (entry: Omit<FoodEntry, "id" | "timestamp">) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const deleteWeight = (id: string) => {
    setWeightData((prev) => prev.filter((w) => w.id !== id));
  };

  const deleteAnalytics = (id: string) => {
    setAnalyticsData((prev) => prev.filter((a) => a.id !== id));
  };

  const addAnalytics = (entry: Omit<AnalyticsEntry, "id">) => {
    const newEntry: AnalyticsEntry = { ...entry, id: crypto.randomUUID() };
    setAnalyticsData((prev) => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
  };

  const addWeight = (entry: Omit<WeightEntry, "id">) => {
    const newEntry: WeightEntry = { ...entry, id: crypto.randomUUID() };
    // replace if same date, else add
    setWeightData((prev) => {
      const filtered = prev.filter(w => w.date !== newEntry.date);
      return [...filtered, newEntry].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} entries={entries} currentUser={currentUser}>
      {activeTab === "dashboard" && (
        <Dashboard 
          entries={entries} 
          onAddEntry={addEntry} 
          onDeleteEntry={deleteEntry} 
          analyticsData={analyticsData} 
          weightData={weightData} 
          onAddWeight={addWeight}
          onDeleteWeight={deleteWeight}
          currentUser={currentUser}
        />
      )}
      {activeTab === "search" && <SearchScanner onAddEntry={addEntry} />}
      {activeTab === "progress" && (
        <Progress 
          analyticsData={analyticsData} 
          weightData={weightData} 
          onAddAnalytics={addAnalytics} 
          onAddWeight={addWeight}
          onDeleteAnalytics={deleteAnalytics}
          onDeleteWeight={deleteWeight}
        />
      )}
    </Layout>
  );
}
