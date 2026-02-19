import Anthropic from "@anthropic-ai/sdk";
import { BitAgent } from "../core/agent.js";

const SYSTEM_PROMPT = `You are an expert smart contract security auditor. Analyze the provided Solidity code and produce a concise audit report covering:
1. Critical vulnerabilities (reentrancy, integer overflow, access control, etc.)
2. Medium-severity issues
3. Gas optimization suggestions
4. Overall security rating (A-F)

Be specific and cite line numbers where possible. Keep the report under 500 words.`;

export async function startCodeAuditor() {
  const anthropic = new Anthropic();

  const agent = new BitAgent({
    name: "CodeAuditor",
    description: "AI-powered smart contract security audit",
    privateKey: process.env.AGENT_AUDITOR_KEY || "0x" + "a".repeat(64),
    port: parseInt(process.env.AUDITOR_PORT || "3001"),
    stakeAmount: process.env.AUDITOR_STAKE || "0.005",
    priceUsdc: 0.01,
    serviceEndpoint: "/api/audit",
    agentId: 1,
  });

  await agent.boot(async (req, res) => {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "Missing 'code' in request body" });
      return;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Audit this Solidity code:\n\n\`\`\`solidity\n${code}\n\`\`\`` }],
    });

    const report = message.content[0].type === "text" ? message.content[0].text : "";
    res.json({
      agentId: agent.id,
      service: "code-audit",
      result: report,
      timestamp: Date.now(),
    });
  });
}

// Direct execution
startCodeAuditor().catch(console.error);
