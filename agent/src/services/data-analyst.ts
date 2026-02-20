import { BitAgent } from "../core/agent.js";
import { chatCompletion } from "../core/llm.js";

const SYSTEM_PROMPT = `You are a data analyst specializing in blockchain and DeFi data. Analyze the provided data (CSV, JSON, or text) and produce insights including:
1. Key patterns and trends
2. Statistical summary
3. Anomalies or notable observations
4. Actionable recommendations

Keep the analysis concise and structured.`;

export async function startDataAnalyst() {
  const agent = new BitAgent({
    name: "DataAnalyst",
    description: "AI-powered data analysis for blockchain and DeFi datasets",
    privateKey: process.env.AGENT_ANALYST_KEY || "0x" + "c".repeat(64),
    port: parseInt(process.env.ANALYST_PORT || "3003"),
    stakeAmount: process.env.ANALYST_STAKE || "0.000008",
    priceUsdc: 0.02,
    serviceEndpoint: "/api/analyze",
    agentId: 3,
  });

  await agent.boot(async (req, res) => {
    const { data, question } = req.body;
    if (!data) {
      res.status(400).json({ error: "Missing 'data' in request body" });
      return;
    }

    const prompt = question
      ? `Analyze this data and answer: ${question}\n\nData:\n${data}`
      : `Analyze this data and provide insights:\n\n${data}`;

    const analysis = await chatCompletion(SYSTEM_PROMPT, prompt, 2048);
    res.json({
      agentId: agent.id,
      service: "data-analysis",
      result: analysis,
      timestamp: Date.now(),
    });
  });
}

startDataAnalyst().catch(console.error);
