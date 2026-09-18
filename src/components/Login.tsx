import { useState } from "react";
import { BrandLogo } from "./BrandLogo";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === "marco" && password === "modosano2026") {
      onLogin();
    } else {
      setError("Credenciales incorrectas. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 font-sans p-6 selection:bg-slate-200 dark:selection:bg-slate-800">
      <div className="w-full max-w-sm">
        <div className="mb-16 flex justify-center">
          <BrandLogo size="lg" />
        </div>
        
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className="w-full border-b-2 border-slate-100 dark:border-slate-800 bg-transparent py-3 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors text-xl font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
              placeholder="Escribe tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full border-b-2 border-slate-100 dark:border-slate-800 bg-transparent py-3 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors text-xl font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
              placeholder="Escribe tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl text-base font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors mt-8"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
