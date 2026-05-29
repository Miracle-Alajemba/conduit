import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { publicClient } from "./client.js";
import { getBalance, GetBalanceSchema } from "./tools/get_balance.js";
import { getTransactions, GetTransactionsSchema } from "./tools/get_transactions.js";
import { getTokenPrice, GetTokenPriceSchema } from "./tools/get_token_price.js";

// Initialize the MCP server
const server = new Server(
  {
    name: "celo-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register the ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ping",
        description: "Ping the Celo network to verify connectivity and get the latest block number.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_balance",
        description: "Fetch token balances (CELO, USDC, cUSD, cKES, cEUR) for any Celo wallet address.",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Celo wallet address (0x...)",
            },
            tokens: {
              type: "array",
              items: {
                type: "string",
                enum: ["CELO", "USDC", "cUSD", "cKES", "cEUR"],
              },
              description: "Tokens to fetch balances for. Defaults to CELO, USDC, cUSD",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "get_transactions",
        description: "Fetch recent transactions for a Celo wallet address.",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Celo wallet address (0x...)",
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 50,
              description: "Limit the number of returned transactions (default: 10, max: 50)",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "get_token_price",
        description: "Fetch live token prices in USD for CELO, USDC, cUSD, cEUR, and cKES.",
        inputSchema: {
          type: "object",
          properties: {
            tokens: {
              type: "array",
              items: {
                type: "string",
                enum: ["CELO", "USDC", "cUSD", "cKES", "cEUR"],
              },
              description: "Tokens to fetch prices for. Defaults to CELO",
            },
          },
        },
      },
    ],
  };
});

// Register the CallTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === "ping") {
    try {
      const blockNumber = await publicClient.getBlockNumber();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "ok",
              chain: "celo",
              blockNumber: blockNumber.toString(),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running ping tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error pinging Celo network: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "get_balance") {
    try {
      const args = GetBalanceSchema.parse(request.params.arguments);
      const result = await getBalance(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running get_balance tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error fetching balance: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "get_transactions") {
    try {
      const args = GetTransactionsSchema.parse(request.params.arguments);
      const result = await getTransactions(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running get_transactions tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error fetching transactions: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "get_token_price") {
    try {
      const args = GetTokenPriceSchema.parse(request.params.arguments);
      const result = await getTokenPrice(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running get_token_price tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error fetching token prices: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  throw new Error(`Tool not found: ${name}`);
});

// Start the server using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Celo MCP] Server is running on stdio transport");
}

run().catch((error) => {
  console.error("[Celo MCP] Fatal error starting server:", error);
  process.exit(1);
});
