import Anthropic from "@anthropic-ai/sdk";
import { BitAgent } from "../core/agent.js";

const SYSTEM_PROMPT = `You are a professional translator specializing in Chinese-English translation for blockchain and AI technology. Translate the provided text accurately, preserving technical terms and formatting. Output only the translation, no explanations.`;

export async function startTranslateBot() {
  const anthropic = new Anthropic();

  const agent = new BitAgent({
    name: "TranslateBot",
    description: "High-quality Chinese-English translation for blockchain/AI content",
    privateKey: process.env.AGENT_TRANSLATOR_KEY || "0x" + "b".repeat(64),
    port: parseInt(process.env.TRANSLATOR_PORT || "3002"),
    stakeAmount: process.env.TRANSLATOR_STAKE || "0.003",
    priceUsdc: 0.005,
    serviceEndpoint: "/api/translate",
    agentId: 2,
  });

  await agent.boot(async (req, res) => {
    const { text, direction } = req.body;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' in request body" });
      return;
    }

    const dir = direction === "en-zh" ? "English to Chinese" : "Chinese to English";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Translate the following text from ${dir}:\n\n${text}` }],
    });

    const translation = message.content[0].type === "text" ? message.content[0].text : "";
    res.json({
      agentId: agent.id,
      service: "translation",
      direction: dir,
      result: translation,
      timestamp: Date.now(),
    });
  });
}

startTranslateBot().catch(console.error);
