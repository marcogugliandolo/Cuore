import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Multer for handling file uploads (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const classificationPrompt = `
Eres un nutricionista experto. Clasifica el siguiente alimento/producto estrictamente como 'Bueno', 'Moderado' o 'Evitar' para una persona con triglicéridos muy altos (231 mg/dL) y el objetivo de bajarlos a <150.
Criterio:
- Bueno: grasas saludables (omega-3, monoinsaturadas), fibra, verduras, proteína magra, sin azúcares añadidos ni harinas refinadas.
- Moderado: carbohidratos complejos o frutas enteras en cantidades normales, lácteos.
- Evitar: azúcares simples, fritos, alcohol, carbohidratos refinados, grasas saturadas/trans, fruta desecada con azúcar, zumos.

Debes devolver el resultado ÚNICAMENTE en el siguiente formato JSON válido sin markdown ni texto extra:
{
  "status": "Bueno" | "Moderado" | "Evitar",
  "reason": "Explicación muy breve de máximo 3 líneas (en un tono directo pero empático)."
}
`;

// 1. Text-based Classification
app.post("/api/classify", async (req, res) => {
  try {
    const { food } = req.body;
    if (!food) {
      return res.status(400).json({ error: "Missing food item" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${classificationPrompt}\nAlimento a analizar: ${food}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Error classifying food:", error);
    res.status(500).json({ error: "Error classifying food" });
  }
});

// 2. Image-based Classification (Label Scanner)
app.post("/api/scan", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          }
        },
        `${classificationPrompt}\nAnaliza los ingredientes y tabla nutricional de este producto desde la imagen.`
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Error scanning label:", error);
    res.status(500).json({ error: "Error scanning label" });
  }
});

// 3. Scan Analytics (Blood test)
app.post("/api/analytics", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Error analyzing blood test:", error);
    res.status(500).json({ error: "Error analyzing blood test" });
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
