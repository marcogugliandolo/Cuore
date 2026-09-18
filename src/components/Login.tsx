import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { TamagotchiShell } from "./TamagotchiShell";

// Frame 0: Relaxed / diastolic heart state
const leftA = [
  "................",
  "................",
  "................",
  "................",
  ".......#####....",
  ".....#########..",
  "....###########.",
  "...#############",
  "...###...#######",
  "..##.......#####",
  "..##.......#####",
  "..##.......#####",
  "...###...#######",
  "...#############",
  "....############",
  ".....###########",
  "......##########",
  ".......#########",
  "........########",
  ".........#######",
  "..........######",
  "...........#####",
  "............####",
  ".............###",
  "..............##",
  "...............#",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const rightA = [
  "................",
  "................",
  "................",
  "................",
  ".......#####....",
  ".....#########..",
  "....###########.",
  "...#############",
  "...#############",
  "..##############",
  "..##############",
  "..##############",
  "...#############",
  "...#############",
  "....############",
  ".....###########",
  "......##########",
  ".......#########",
  "........########",
  ".........#######",
  "..........######",
  "...........#####",
  "............####",
  ".............###",
  "..............##",
  "...............#",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

// Frame 1: Pumping / systolic expansion beat with pulse shockwaves
const leftB = [
  "................",
  "....#...........",
  ".....##..######.",
  "..#...##########",
  ".##.############",
  "..#.############",
  "....###...######",
  "...##.......####",
  "...##.......####",
  ".#..##.....#####",
  "##...###########",
  ".#...###########",
  ".....###########",
  "......##########",
  ".......#########",
  "..#.....########",
  ".##......#######",
  "..#.......######",
  "...........#####",
  "............####",
  ".............###",
  "..............##",
  "...............#",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const rightB = [
  "................",
  "....#...........",
  ".....##..######.",
  "..#...##########",
  ".##.############",
  "..#.############",
  "....############",
  "...#############",
  "...#############",
  ".#..############",
  "##...###########",
  ".#...###########",
  ".....###########",
  "......##########",
  ".......#########",
  "..#.....########",
  ".##......#######",
  "..#.......######",
  "...........#####",
  "............####",
  ".............###",
  "..............##",
  "...............#",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const FRAME_0 = leftA.map((l, i) => l + rightA[i].split("").reverse().join(""));
const FRAME_1 = leftB.map((l, i) => l + rightB[i].split("").reverse().join(""));

function gridToRects(grid: string[]) {
  const rects: { x: number; y: number; w: number }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === "#") {
        const start = x;
        while (x < row.length && row[x] === "#") x++;
        rects.push({ x: start, y, w: x - start });
      } else {
        x++;
      }
    }
  });
  return rects;
}

const RECTS_0 = gridToRects(FRAME_0);
const RECTS_1 = gridToRects(FRAME_1);

interface LoginProps {
  onLogin: (user: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [frame, setFrame] = useState(0);

  // Rhythmic heartbeat simulation (lub-dub double pulse cadence)
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    const interval = setInterval(() => {
      setFrame(1);
      t1 = setTimeout(() => {
        setFrame(0);
        t2 = setTimeout(() => {
          setFrame(1);
          t3 = setTimeout(() => {
            setFrame(0);
          }, 160);
        }, 120);
      }, 180);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim().toLowerCase();

    // Credenciales autorizadas
    const isMarco = (cleanUser === "marco" || cleanUser === "admin" || cleanUser === "cuore") &&
      ["modosano2026", "mundosano2026", "marco", "1234"].includes(cleanPass);

    const isClaudia = cleanUser === "claudia" &&
      ["bombon2026", "bombón2026", "claudia"].includes(cleanPass);

    if (isMarco) {
      onLogin("Marco");
    } else if (isClaudia) {
      onLogin("Claudia");
    } else {
      setError("X ERROR DE ACCESO X");
    }
  };

  return (
    <TamagotchiShell>
      <div className="flex flex-col items-center justify-center h-full space-y-5 py-4">
        
        <div className="text-center space-y-2 mb-1">
          <div className="flex justify-center text-[#0f380f] drop-shadow-sm">
            <svg viewBox="0 0 32 32" className="w-24 h-24 sm:w-28 sm:h-28 fill-current" shapeRendering="crispEdges">
              {(frame === 0 ? RECTS_0 : RECTS_1).map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w} height={1} />
              ))}
            </svg>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-wider">CONÉCTATE</h2>
        </div>
        
        <form onSubmit={handleLogin} className="w-full max-w-[270px] sm:max-w-xs md:max-w-sm space-y-4">
          <div className="space-y-1">
            <label className="block text-lg font-bold uppercase" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              className="w-full border-4 border-[#0f380f] bg-[#8bac0f] p-2 focus:outline-none focus:bg-[#9bbc0f] text-2xl font-bold uppercase"
              placeholder=""
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-lg font-bold uppercase" htmlFor="password">
              Código / Clave
            </label>
            <input
              id="password"
              type="password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="current-password"
              className="w-full border-4 border-[#0f380f] bg-[#8bac0f] p-2 focus:outline-none focus:bg-[#9bbc0f] text-2xl font-bold font-mono tracking-wider"
              placeholder=""
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
            />
          </div>

          {error && (
            <div className="bg-[#0f380f] text-[#9bbc0f] p-2 text-center font-bold text-base leading-tight">
              <p className="animate-pulse">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-3 border-4 border-[#0f380f] active:bg-[#8bac0f] active:text-[#0f380f] transition-colors"
          >
            ENTRAR
          </button>
        </form>

      </div>
    </TamagotchiShell>
  );
}
