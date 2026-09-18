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
  onLogin: () => void;
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
    if (username.toLowerCase() === "marco" && password === "modosano2026") {
      onLogin();
    } else {
      setError("X ERROR DE ACCESO X");
    }
  };

  return (
    <TamagotchiShell>
      <div className="flex flex-col items-center justify-center h-full space-y-6 py-6">
        
        <div className="text-center space-y-3 mb-2">
          <div className="flex justify-center text-[#0f380f] drop-shadow-sm">
            <svg viewBox="0 0 32 32" className="w-28 h-28 fill-current" shapeRendering="crispEdges">
              {(frame === 0 ? RECTS_0 : RECTS_1).map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w} height={1} />
              ))}
            </svg>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-wider">CONÉCTATE</h2>
        </div>
        
        <form onSubmit={handleLogin} className="w-full max-w-[250px] space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xl font-bold uppercase" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className="w-full border-4 border-[#0f380f] bg-[#8bac0f] p-2.5 focus:outline-none focus:bg-[#9bbc0f] text-2xl font-bold placeholder-[#0f380f]/40 uppercase"
              placeholder="USUARIO..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-xl font-bold uppercase" htmlFor="password">
              Código
            </label>
            <input
              id="password"
              type="password"
              className="w-full border-4 border-[#0f380f] bg-[#8bac0f] p-2.5 focus:outline-none focus:bg-[#9bbc0f] text-2xl font-bold placeholder-[#0f380f]/40"
              placeholder="****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-[#0f380f] text-[#9bbc0f] p-2 text-center font-bold text-lg animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#0f380f] text-[#9bbc0f] text-2xl font-black py-3.5 border-4 border-[#0f380f] active:bg-[#8bac0f] active:text-[#0f380f] transition-colors mt-2"
          >
            ENTRAR
          </button>
        </form>

      </div>
    </TamagotchiShell>
  );
}
