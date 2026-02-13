import { Message } from "../types.ts";

export async function getChatResponse(history: Message[]): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.text || "Lo siento, tuve un pequeño problema técnico.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "En este momento tenemos una alta demanda. Por favor, escríbenos a nuestro WhatsApp oficial.";
  }
}
