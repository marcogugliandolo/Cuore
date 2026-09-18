import express from "express";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Storage directory path - supports Docker volume mounted at /app/data or local fallback ./data
// In Docker container, /app is the working directory and /app/data is mounted as volume.
let DATA_DIR = process.env.DATA_DIR;
if (!DATA_DIR) {
  if (fs.existsSync("/app")) {
    DATA_DIR = "/app/data";
  } else {
    DATA_DIR = path.join(process.cwd(), "data");
  }
}
const DATA_FILE = path.join(DATA_DIR, "cuore_data.json");

// Ensure data directory and initial data file exist immediately on server startup
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log("[STORAGE] Directorio creado en:", DATA_DIR);
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      entries: [],
      analyticsData: [],
      weightData: [],
      user: "Marco",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    console.log("[STORAGE] Archivo inicial creado en:", DATA_FILE);
  }
} catch (err) {
  console.warn("[STORAGE] Error asegurando archivo/directorio de datos:", err);
}

// Initialize Gemini Client lazily with User-Agent header for telemetry and 60s timeout
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno del servidor. Por favor, configura GEMINI_API_KEY o introduce los datos manualmente.");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 60000,
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Multer for handling file uploads (in-memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper to inspect magic bytes and detect true MIME type
function detectMimeType(buffer: Buffer, originalName = "", fallback = "image/jpeg"): string {
  if (buffer && buffer.length > 4) {
    // PDF: %PDF-
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return "application/pdf";
    }
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return "image/png";
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return "image/jpeg";
    }
    // WebP: RIFF ... WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return "image/webp";
    }
    // GIF: GIF8
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return "image/gif";
    }
  }

  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";

  return fallback;
}

// Helper for calling Gemini with model fallback and automatic retry on 503/429/fetch failed
async function callGeminiWithRetry(
  params: {
    contents: any;
    config?: any;
  },
  taskName = "gemini-call"
): Promise<string> {
  const client = getGeminiClient();
  const models = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
  ];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const causeMsg = err?.cause?.message || err?.cause || "";
        const status = err?.status || err?.code || (err?.error && err?.error?.code);
        const errMsg = `${err?.message || err} ${causeMsg}`.toLowerCase();

        console.warn(
          `[${taskName}] Attempt ${attempt + 1} with model '${model}' failed:`,
          err?.message || err,
          causeMsg ? `(cause: ${causeMsg})` : ""
        );

        // When quota is exhausted (429 / RESOURCE_EXHAUSTED / Quota exceeded),
        // immediately advance to the next model in the pool instead of re-trying the same exhausted model.
        const isQuotaExhausted =
          status === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("quota") ||
          errMsg.includes("resource_exhausted");

        if (isQuotaExhausted) {
          break;
        }

        const isTemporaryNetworkError =
          status === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("fetch failed") ||
          errMsg.includes("network") ||
          errMsg.includes("timeout") ||
          errMsg.includes("socket") ||
          errMsg.includes("econnreset") ||
          errMsg.includes("etimedout") ||
          errMsg.includes("und_err") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable");

        if (isTemporaryNetworkError && attempt === 0) {
          // Wait with brief backoff before retrying this model
          await new Promise((resolve) => setTimeout(resolve, 800));
        } else {
          // Move to next fallback model
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to get response from Gemini models");
}

function fallbackFoodClassification(food: string) {
  const f = food.toLowerCase();
  const avoidWords = [
    "azucar", "azúcar", "dulce", "bollo", "galleta", "frito", "frita",
    "refresco", "coca", "alcohol", "cerveza", "vino", "patatas fritas",
    "embutido", "tocino", "mantequilla", "margarina", "jarabe", "sirope",
    "croissant", "chocapic", "donut"
  ];
  const goodWords = [
    "pescado", "sardina", "salmon", "salmón", "atun", "atún", "caballa",
    "verdura", "ensalada", "espinaca", "brocoli", "brócoli", "lenteja",
    "garbanzo", "alubia", "nuez", "nueces", "almendra", "aguacate",
    "avena", "aceite de oliva", "chia", "chía", "lino", "pechuga",
    "huevo", "tofu", "yogur natural"
  ];

  for (const w of avoidWords) {
    if (f.includes(w)) {
      return {
        status: "Evitar" as const,
        reason: "Contiene azúcares, harinas refinadas o grasas poco recomendables para triglicéridos altos.",
      };
    }
  }
  for (const w of goodWords) {
    if (f.includes(w)) {
      return {
        status: "Bueno" as const,
        reason: "Aporte beneficioso de ácidos grasos saludables, fibra o proteínas magras cardiosaludables.",
      };
    }
  }
  return {
    status: "Moderado" as const,
    reason: "Consumir con moderación y revisar que no contenga azúcares añadidos ni grasas saturadas.",
  };
}

const classificationPrompt = `
Eres un nutricionista experto. Clasifica el siguiente alimento/producto estrictamente como 'Bueno', 'Moderado' o 'Evitar' para una persona con triglicéridos muy altos (231 mg/dL) y el objetivo de bajarlos a <150.
Criterio:
- Bueno: grasas saludables (omega-3, monoinsaturadas), fibra, verduras, proteína magra, sin azúcares añadidos ni harinas refinadas.
- Moderado: carbohidratos complejos o frutas enteras en cantidades normales, lácteos desnatados/naturales.
- Evitar: azúcares simples, fritos, alcohol, carbohidratos refinados, grasas saturadas/trans, fruta desecada con azúcar, zumos.

Debes devolver el resultado ÚNICAMENTE en el siguiente formato JSON válido sin markdown ni texto extra:
{
  "status": "Bueno" | "Moderado" | "Evitar",
  "reason": "Explicación muy breve de máximo 3 líneas (en un tono directo pero empático)."
}
`;

// 1. Text-based Classification
app.post("/api/classify", async (req, res) => {
  const { food } = req.body;
  if (!food) {
    return res.status(400).json({ error: "Introduce un alimento para analizar" });
  }

  try {
    const rawText = await callGeminiWithRetry(
      {
        contents: `${classificationPrompt}\nAlimento a analizar: ${food}`,
        config: {
          responseMimeType: "application/json",
        },
      },
      "classify-food"
    );

    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    res.json(parsed);
  } catch (error: any) {
    console.warn("Fallback classification triggered for:", food, error?.message);
    // Graceful fallback prevents blocking the user when Google models experience temporary demand spikes
    const fallback = fallbackFoodClassification(food);
    res.json(fallback);
  }
});

// 2. Image-based Classification (Label Scanner)
app.post("/api/scan", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha proporcionado ninguna imagen" });
    }

    const mimeType = detectMimeType(req.file.buffer, req.file.originalname, req.file.mimetype || "image/jpeg");

    const rawText = await callGeminiWithRetry(
      {
        contents: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType,
            },
          },
          `${classificationPrompt}\nAnaliza los ingredientes y tabla nutricional de este producto desde la imagen.`,
        ],
        config: {
          responseMimeType: "application/json",
        },
      },
      "scan-label"
    );

    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    res.json(parsed);
  } catch (error: any) {
    console.error("Error scanning label:", error);
    const msg = `${error?.message || error}`;
    if (msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: "GEMINI_API_KEY no configurada en el servidor. Puedes registrar el alimento manualmente por su nombre.",
      });
    }
    res.status(503).json({
      error: "El servicio de escaneo no pudo procesar la imagen en este momento. Por favor, reintenta o escribe el nombre del alimento.",
    });
  }
});

// 3. Scan Analytics (Blood test)
app.post("/api/analytics", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha proporcionado ninguna imagen" });
    }

    const mimeType = detectMimeType(req.file.buffer, req.file.originalname, req.file.mimetype || "image/jpeg");

    const prompt = `
      Analiza esta analítica de sangre (blood test). Extrae los valores de Triglicéridos y Colesterol Total.
      Devuelve ÚNICAMENTE un JSON válido con esta estructura estricta, sin markdown ni comillas extra:
      {
        "triglycerides": number (o null si no lo encuentras),
        "cholesterol": number (o null si no lo encuentras),
        "notes": "Un resumen de 2 líneas de los hallazgos principales desde el punto de vista metabólico, en español"
      }
    `;

    const rawText = await callGeminiWithRetry(
      {
        contents: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: "application/json",
        },
      },
      "scan-analytics"
    );

    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    res.json(parsed);
  } catch (error: any) {
    console.error("Error analyzing blood test:", error);
    const msg = `${error?.message || error}`;
    if (msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: "GEMINI_API_KEY no configurada en el servidor. Puedes añadir tu analítica manualmente con el botón '+ Analítica'.",
      });
    }
    res.status(503).json({
      error: "Error temporal de conexión al leer la analítica. Por favor, reintenta o introduce los valores con el botón '+ Analítica'.",
    });
  }
});

// Helper for deterministic fallback weekly analysis
function fallbackWeeklyAnalysis(entries: any[], latestAnalytics?: any) {
  const goodEntries = entries.filter((e) => e.status === "Bueno");
  const avoidEntries = entries.filter((e) => e.status === "Evitar");
  const moderateEntries = entries.filter((e) => e.status === "Moderado");
  const total = entries.length;

  let score: "Excelente" | "Favorable" | "Atención" | "Crítico" = "Favorable";
  if (total === 0) {
    return {
      score: "Atención" as const,
      summary: "No hay comidas registradas en la última semana. Registra tus comidas diarias para recibir consejos nutricionales personalizados.",
      strengths: ["Compromiso inicial con el control de triglicéridos."],
      risksToFix: ["Falta de registro continuo de comidas."],
      keyPoints: [
        "Comienza registrando tu desayuno, comida y cena cada día.",
        "Prioriza pescados ricos en Omega-3 (sardina, salmón, caballa) 2-3 veces por semana.",
        "Sustituye panes y arroces blancos por cereales enteros y verduras."
      ],
      tamagotchiVerdict: "¡Aliméntame con registros reales para que pueda cuidar de tu corazón!",
      analyzedCount: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const avoidRatio = avoidEntries.length / total;
  const goodRatio = goodEntries.length / total;

  if (avoidRatio >= 0.4) score = "Crítico";
  else if (avoidRatio >= 0.2) score = "Atención";
  else if (goodRatio >= 0.6) score = "Excelente";
  else score = "Favorable";

  const strengths: string[] = [];
  if (goodEntries.length > 0) {
    const goodNames = Array.from(new Set(goodEntries.map((e) => e.name))).slice(0, 3).join(", ");
    strengths.push(`Has incorporado alimentos protectores cardiovasculares: ${goodNames}.`);
  }
  if (avoidEntries.length === 0) {
    strengths.push("Excelente disciplina: 0 comidas clasificadas como 'Evitar' en los últimos 7 días.");
  } else if (avoidRatio < 0.25) {
    strengths.push(`Baja frecuencia de alimentos inflamatorios (${avoidEntries.length} de ${total} comidas).`);
  }
  if (strengths.length === 0) {
    strengths.push("Has mantenido el registro activo de tus hábitos alimentarios.");
  }

  const risksToFix: string[] = [];
  if (avoidEntries.length > 0) {
    const avoidNames = Array.from(new Set(avoidEntries.map((e) => e.name))).slice(0, 3).join(", ");
    risksToFix.push(`Presencia de alimentos con alto impacto glucémico o lipídico: ${avoidNames}.`);
  }
  if (goodEntries.length < 3) {
    risksToFix.push("Bajo aporte de fuentes concentradas de Omega-3 y fibra soluble en la semana.");
  }
  if (risksToFix.length === 0) {
    risksToFix.push("Vigilar el tamaño de las porciones en carbohidratos complejos.");
  }

  const keyPoints: string[] = [
    "Sustituye harinas y cereales refinados por legumbres o verduras en cada plato principal.",
    "Asegura 2 a 3 raciones semanales de pescado azul (sardinas, caballa o salmón) para potenciar el efecto anti-triglicéridos del EPA/DHA.",
    "Elimina bebidas azucaradas, zumos y alcohol: son el principal detonante de la síntesis hepática de triglicéridos."
  ];

  const trigVal = latestAnalytics?.triglycerides;
  const trigNote = trigVal ? ` (tu última analítica marcó ${trigVal} mg/dL)` : "";

  let tamagotchiVerdict = "¡Buen trabajo! Sigue sumando comidas verdes para bajar esos triglicéridos.";
  if (score === "Excelente") {
    tamagotchiVerdict = "¡( ^ _ ^ ) Tu corazón late fuerte y limpio! Estás en la senda ideal para reducir triglicéridos.";
  } else if (score === "Crítico") {
    tamagotchiVerdict = "( > _ < ) ¡Alerta! Demasiados azúcares y grasas nocivas. Tu hígado necesita un respiro urgente.";
  } else if (score === "Atención") {
    tamagotchiVerdict = "( = _ = ) Ojo con los pequeños descuidos. Corrige los alimentos a evitar esta semana.";
  }

  return {
    score,
    summary: `En los últimos 7 días has registrado ${total} comida(s)${trigNote}. Con un ${Math.round(goodRatio * 100)}% de opciones cardiosaludables y ${avoidEntries.length} alimento(s) de riesgo.`,
    strengths,
    risksToFix,
    keyPoints,
    tamagotchiVerdict,
    analyzedCount: total,
    generatedAt: new Date().toISOString(),
  };
}

// 4. Weekly Food Analysis with Gemini for Triglyceride Reduction
app.post("/api/weekly-analysis", async (req, res) => {
  const { entries, latestAnalytics, latestWeight, user } = req.body;
  const recentEntries = Array.isArray(entries) ? entries : [];

  if (recentEntries.length === 0) {
    return res.json(fallbackWeeklyAnalysis([], latestAnalytics));
  }

  const foodSummaryList = recentEntries
    .map((e: any, idx: number) => {
      const dateStr = e.timestamp ? new Date(e.timestamp).toISOString().split("T")[0] : "";
      const meal = e.mealType ? `[${e.mealType}]` : "";
      return `${idx + 1}. ${dateStr} ${meal} ${e.name} -> Clasificación: ${e.status} (Motivo: ${e.reason || "N/A"})`;
    })
    .join("\n");

  const prompt = `
Eres un médico y nutricionista clínico de élite especializado en metabolismo lipídico y reducción rápida y sostenible de triglicéridos.
Analiza con rigor las comidas registradas por el usuario (${user || "el paciente"}) durante la última semana y proporciona un informe clínico claro, empático y orientado a la acción.

Contexto del paciente:
- Última analítica de triglicéridos: ${latestAnalytics?.triglycerides ? `${latestAnalytics.triglycerides} mg/dL (Fecha: ${latestAnalytics.date})` : "No disponible (Objetivo clínico: <150 mg/dL)"}
- Colesterol total: ${latestAnalytics?.cholesterol ? `${latestAnalytics.cholesterol} mg/dL` : "No disponible"}
- Peso actual: ${latestWeight ? `${latestWeight} kg` : "No registrado"}
- Total comidas analizadas en la semana: ${recentEntries.length}

Listado de comidas de los últimos 7 días:
${foodSummaryList}

CRITERIOS MÉDICOS PARA TRIGLICÉRIDOS:
1. Lo que más eleva los triglicéridos: azúcares simples (fructosa de zumos, refrescos, azúcar añadido), harinas refinadas (pan blanco, pasta, arroz), alcohol (incluso dosis moderadas elevan la síntesis hepática de VLDL) y grasas trans/saturadas.
2. Lo que más los reduce: Omega-3 de cadena larga (pescado azul: sardina, caballa, salmón), fibra soluble (avena, legumbres, psyllium), aceite de oliva virgen extra, vegetales de hoja verde y ejercicio/déficit calórico.

Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{
  "score": "Excelente" | "Favorable" | "Atención" | "Crítico",
  "summary": "Resumen clínico de 2-3 frases directas sobre el balance de su semana respecto a los triglicéridos.",
  "strengths": [
    "Acierto 1 detectado en sus comidas reales",
    "Acierto 2 detectado (si aplica)"
  ],
  "risksToFix": [
    "Patrón o alimento perjudicial detectado que eleva triglicéridos",
    "Segundo punto crítico a corregir"
  ],
  "keyPoints": [
    "Consejo práctico 1 para bajar triglicéridos ajustado a lo que come",
    "Consejo práctico 2 enfocado en sustituciones clave",
    "Consejo práctico 3 sobre hábitos o tiempos de ingesta"
  ],
  "tamagotchiVerdict": "Frase corta y enérgica en tono mascota virtual retro (estilo Tamagotchi animado) para motivar al usuario."
}
`;

  try {
    const rawText = await callGeminiWithRetry(
      {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      },
      "weekly-analysis"
    );

    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return res.json({
      score: parsed.score || "Favorable",
      summary: parsed.summary || "Análisis semanal completado.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      risksToFix: Array.isArray(parsed.risksToFix) ? parsed.risksToFix : [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      tamagotchiVerdict: parsed.tamagotchiVerdict || "¡Sigue cuidando tu corazón!",
      analyzedCount: recentEntries.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn("Fallback weekly analysis triggered:", error?.message);
    const fallback = fallbackWeeklyAnalysis(recentEntries, latestAnalytics);
    return res.json(fallback);
  }
});

// 5. Persistence endpoints for Docker Volume /app/data
app.get("/api/data", async (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = await fsPromises.readFile(DATA_FILE, "utf-8");
      return res.json(JSON.parse(content));
    }
    // Return empty payload if not yet initialized
    return res.json({
      entries: [],
      analyticsData: [],
      weightData: [],
      user: "Marco",
    });
  } catch (error: any) {
    console.error("Error reading data file:", error);
    res.status(500).json({ error: "No se pudieron cargar los datos del servidor" });
  }
});

app.post("/api/data", async (req, res) => {
  try {
    const { entries, analyticsData, weightData, user } = req.body;
    
    // Ensure dir exists
    if (!fs.existsSync(DATA_DIR)) {
      await fsPromises.mkdir(DATA_DIR, { recursive: true });
    }

    const payload = {
      entries: entries || [],
      analyticsData: analyticsData || [],
      weightData: weightData || [],
      user: user || "Marco",
      updatedAt: new Date().toISOString(),
    };

    // Atomic-like write with temp file
    const tempFile = `${DATA_FILE}.tmp`;
    await fsPromises.writeFile(tempFile, JSON.stringify(payload, null, 2), "utf-8");
    await fsPromises.rename(tempFile, DATA_FILE);

    return res.json({ success: true, savedAt: payload.updatedAt });
  } catch (error: any) {
    console.error("Error saving data file:", error);
    res.status(500).json({ error: "No se pudieron guardar los datos en el servidor" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
