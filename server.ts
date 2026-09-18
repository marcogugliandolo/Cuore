import express from "express";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Storage directory path - supports Docker volume mounted at /app/data or local fallback ./data
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync("/app/data") ? "/app/data" : path.join(process.cwd(), "data"));
const DATA_FILE = path.join(DATA_DIR, "cuore_data.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create DATA_DIR:", err);
  }
}

// Initialize Gemini Client with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Multer for handling file uploads (in-memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper for calling Gemini with model fallback and automatic retry on 503/429
async function callGeminiWithRetry(
  params: {
    contents: any;
    config?: any;
  },
  taskName = "gemini-call"
): Promise<string> {
  const models = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[${taskName}] Attempt ${attempt + 1} with model '${model}' failed:`,
          err?.message || err
        );

        const status = err?.status || err?.code || (err?.error && err?.error?.code);
        const errMsg = `${err?.message || err}`;
        const isTemporaryError =
          status === 503 ||
          status === 429 ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTemporaryError && attempt === 0) {
          // Wait briefly before retrying this model
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

    const rawText = await callGeminiWithRetry(
      {
        contents: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype || "image/jpeg",
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
    res.status(503).json({
      error: "El servicio de escaneo está saturado momentáneamente. Por favor, reintenta en unos segundos.",
    });
  }
});

// 3. Scan Analytics (Blood test)
app.post("/api/analytics", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha proporcionado ninguna imagen" });
    }

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
              mimeType: req.file.mimetype || "image/jpeg",
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
    res.status(503).json({
      error: "El servicio de análisis médico está saturado momentáneamente. Por favor, reintenta en unos segundos.",
    });
  }
});

// 4. Persistence endpoints for Docker Volume /app/data
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
