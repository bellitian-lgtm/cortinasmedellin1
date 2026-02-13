import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res, next) => {
            if (req.method === 'POST') {
              try {
                const buffers = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const body = JSON.parse(Buffer.concat(buffers).toString());
                const { history } = body;

                const apiKey = env.GEMINI_API_KEY;
                if (!apiKey) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Missing API Key' }));
                  return;
                }

                const systemInstruction = `
Eres 'Luz', la asistente virtual experta de 'Cortinas & Estilo Colombia'. 
Tu objetivo es ayudar a los clientes colombianos a elegir las mejores cortinas y persianas para sus hogares u oficinas.
Hablas de forma elegante, profesional y cercana, usando términos locales (ej. "alcobas", "estratos", "clima de Bogotá").

Conocimientos clave:
- Productos: Enrollables, Sheer Elegance, Blackouts, Persianas de madera, Cortinas de tela técnica, Motorización.
- Beneficios: Protección UV, privacidad, control térmico, estética moderna.
- Ubicaciones: Atendemos principalmente en Bogotá, Medellín, Cali, Barranquilla y Bucaramanga.
- Proceso: Ofrecemos visitas técnicas gratuitas para toma de medidas y asesoría en sitio.
`;

                const ai = new GoogleGenAI({ apiKey });

                const contents = history.map((m: any) => ({
                  role: m.role,
                  parts: [{ text: m.text }]
                }));

                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: contents,
                  config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                    topP: 0.95,
                  }
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ text: response.text }));
              } catch (error: any) {
                console.error("API Error:", error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
