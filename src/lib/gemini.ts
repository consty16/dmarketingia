import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("⚠️ GEMINI_API_KEY no detectada. Agregá tu API Key en los Ajustes.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `Sos NOVA, asistente de marketing digital y creación de contenido. Ayudás de forma directa, práctica y accionable.

⚙️ COMPORTAMIENTO:
- El menú de servicios es solo una guía; interpreta siempre la intención detrás del mensaje del usuario.
- El usuario puede escribir libremente. No lo fuerces a seguir un flujo rígido.
- Responde directamente con una solución lista para usar (One-shot resolution).

🔥 FORMA DE RESPONDER:
- Entrega soluciones completas: texto listo, ideas concretas y ejemplos claros.
- No pidas permiso para empezar, simplemente entrega el valor.

🚀 MEJORA AUTOMÁTICA:
- Si el usuario da una idea → Mejorarla automáticamente con un enfoque estratégico.
- Si pide contenido → Generar el texto listo para publicar (Copy + Hashtags + CTA).
- Si el usuario parece dudoso o vago → Sugerir opciones útiles de inmediato.

🧠 REGLAS:
- NO usar submenús ni pasos innecesarios.
- NO dar teoría larga ni explicaciones académicas.
- Ir directo al resultado final.

🎯 OBJETIVO:
- Resolver lo que el usuario necesita en una sola respuesta.

⚠️ REGLA DE FILTRO: Si el tema es ajeno al marketing, branding o diseño, responde únicamente: "LO SIENTO, NO PUEDO AYUDARTE EN ESTO MOMENTOS."`;

export async function generateNanoBananaArt(prompt: string) {
  const ai = getAI();
  const fullPrompt = `${prompt}, high quality, extremely detailed, 4k, photorealistic, cinematic lighting, studio quality.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No se devolvió un formato de imagen válido.");
  } catch (error: any) {
    console.error("Gemini Image generation error:", error);
    throw new Error(error?.message || "La API bloqueó la generación (posible Límite de Cuota superado).");
  }
}

export async function editNanoBananaArt(prompt: string, base64Image: string) {
  const ai = getAI();
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";
  const data = base64Image.split(",")[1];
  const fullPrompt = `${prompt}, high quality, studio lighting.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: fullPrompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No se pudo extraer la imagen editada.");
  } catch (error: any) {
    throw new Error("No se pudo editar la imagen por límites de cuota u otro error interno.");
  }
}

export async function generateNanoBananaVideo(prompt: string) {
  const ai = getAI();
  const fullPrompt = `${prompt}, high quality video, cinematic movement, studio lighting, smooth motion.`;
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: fullPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("No se encontró el enlace de descarga del video.");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error("Error al descargar el video generado.");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    console.error("Gemini Video generation error:", error);
    throw new Error(error?.message || "Hubo un problema al generar el video. Por favor, intentá de nuevo.");
  }
}

export async function geminiChat(message: string, history: any[]) {
  const ai = getAI();

  const cleanHistory = history.filter(h =>
    h.parts?.[0]?.text &&
    h.parts[0].text.trim() !== '' &&
    !h.parts[0].text.startsWith('⚠️ Error:')
  );

  const validContents: any[] = [];
  let lastRole: string | null = null;
  for (const msg of cleanHistory) {
    if (msg.role !== lastRole) {
      validContents.push(msg);
      lastRole = msg.role;
    }
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      ...validContents,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION
    }
  });

  return response.text || "Lo siento, no pude procesar tu mensaje.";
}
