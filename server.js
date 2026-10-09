import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "O servidor ainda não tem OPENAI_API_KEY configurada." });
    }
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "Escreva uma mensagem." });
    if (message.length > 4000) return res.status(413).json({ error: "Mensagem muito longa." });

    const name = String(req.body?.name || "").slice(0, 60);
    const history = Array.isArray(req.body?.history)
      ? req.body.history.slice(-10).filter(x =>
          x && ["user", "assistant"].includes(x.role) &&
          typeof x.content === "string"
        ).map(x => ({ role: x.role, content: x.content.slice(0, 4000) }))
      : [];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: `Você é Olix, uma assistente virtual simpática, útil e cuidadosa. Responda em português brasileiro, de forma clara. ${name ? `Chame a pessoa de ${name} quando soar natural.` : ""} Não diga que executou ações no aparelho se não executou.`,
      input: [...history, { role: "user", content: message }]
    });
    res.json({ reply: response.output_text || "Não consegui formular uma resposta agora." });
  } catch (err) {
    console.error("Erro na rota /api/chat:", err?.message || err);
    res.status(500).json({ error: "Erro ao consultar a IA. Confira a configuração do servidor." });
  }
});

app.listen(port, () => console.log(`Olix rodando em http://localhost:${port}`));
