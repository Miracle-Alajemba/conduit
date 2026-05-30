import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const CheckAgentIdSchema = z.object({
  agentId: z.string().optional().describe("Self Agent ID to look up"),
  address: z.string().optional().describe("Celo wallet address of the agent")
}).refine(data => data.agentId || data.address, {
  message: "Provide either agentId or address"
});

export type CheckAgentIdInput = z.infer<typeof CheckAgentIdSchema>;

export async function checkAgentId(args: CheckAgentIdInput) {
  const { agentId, address } = args;

  const apiKey = process.env.SELF_API_KEY;
  if (!apiKey || apiKey === "your_self_protocol_api_key") {
    return {
      verified: false,
      message: "SELF_API_KEY not configured. Add it to your .env file."
    };
  }

  let url = "";
  if (agentId) {
    url = `https://api.ai.self.xyz/v1/agents/${encodeURIComponent(agentId)}`;
  } else if (address) {
    url = `https://api.ai.self.xyz/v1/agents?address=${encodeURIComponent(address)}`;
  }

  try {
    console.error(`[Check Agent ID] Calling API: ${url}...`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    if (response.status === 404) {
      return {
        verified: false,
        message: "No agent found with that ID or address"
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        verified: false,
        message: `Self Agent ID API returned error: HTTP ${response.status} - ${errorText || response.statusText}`
      };
    }

    const data: any = await response.json();
    
    // The API might return an array if queried by address
    let agentData = data;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return {
          verified: false,
          message: "No agent found with that ID or address"
        };
      }
      agentData = data[0];
    }

    const resolvedAgentId = agentData.agentId || agentId || "";

    return {
      agentId: resolvedAgentId,
      name: agentData.name || "Unknown Agent",
      owner: agentData.owner || "",
      verified: agentData.verified ?? false,
      registeredAt: agentData.registeredAt || new Date().toISOString(),
      capabilities: Array.isArray(agentData.capabilities) ? agentData.capabilities : [],
      explorerUrl: `https://agentscan.info/agent/${resolvedAgentId}`
    };
  } catch (error: any) {
    console.error("Error calling Self Agent ID API:", error);
    return {
      verified: false,
      message: `Failed to connect to Self Agent ID API: ${error?.message || String(error)}`
    };
  }
}
