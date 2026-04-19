import { GoogleGenAI } from "@google/genai";

// Inicialización perezosa para evitar que la app explote si la llave no está lista al cargar
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // La forma correcta según el skill: usar process.env.GEMINI_API_KEY
    // Asegurate de configurarla en Vercel > Settings > Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("⚠️ GEMINI_API_KEY no detectada. Por favor, agregá tu API Key en Vercel (Settings > Environment Variables) con el nombre GEMINI_API_KEY.");
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
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
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

export async function geminiChat(message: string, history: any[]) {
  const ai = getAI();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', 
    contents: [
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION
    }
  });

  return response.text || "Lo siento, no pude procesar tu mensaje.";
}
