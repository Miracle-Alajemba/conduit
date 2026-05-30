#!/usr/bin/env node
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
import { sendTokens, SendTokensSchema } from "./tools/send_tokens.js";
import { swapTokens, SwapTokensSchema } from "./tools/swap_tokens.js";
import { x402Pay, X402PaySchema } from "./tools/x402_pay.js";
import { lendOnAave, LendOnAaveSchema } from "./tools/lend_on_aave.js";
import { withdrawFromAave, WithdrawFromAaveSchema } from "./tools/withdraw_from_aave.js";
import { selfVerify, SelfVerifySchema } from "./tools/self_verify.js";
import { checkAgentId, CheckAgentIdSchema } from "./tools/check_agent_id.js";

// Initialize the MCP server
const server = new Server(
  {
    name: "conduit",
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
      {
        name: "send_tokens",
        description: "Send CELO or any ERC-20 token (USDC, cUSD, cKES, cEUR) to an address on Celo.",
        inputSchema: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient Celo address (0x...)",
            },
            token: {
              type: "string",
              enum: ["CELO", "USDC", "cUSD", "cKES", "cEUR"],
              description: "The token to send",
            },
            amount: {
              type: "string",
              description: "The amount of tokens to send e.g. '10.5'",
            },
            dryRun: {
              type: "boolean",
              description: "If true, simulate the transaction without executing it (default: true)",
              default: true,
            },
          },
          required: ["to", "token", "amount"],
        },
      },
      {
        name: "swap_tokens",
        description: "Swap between CELO and stablecoins using the Mento protocol.",
        inputSchema: {
          type: "object",
          properties: {
            fromToken: {
              type: "string",
              enum: ["CELO", "USDC", "cUSD", "cKES", "cEUR"],
              description: "The token you want to swap from",
            },
            toToken: {
              type: "string",
              enum: ["CELO", "USDC", "cUSD", "cKES", "cEUR"],
              description: "The token you want to swap to",
            },
            amount: {
              type: "string",
              description: "The amount of fromToken to swap e.g. '10.5'",
            },
            slippageTolerance: {
              type: "number",
              description: "Slippage tolerance in percent (default: 0.5)",
              default: 0.5,
            },
            dryRun: {
              type: "boolean",
              description: "If true, simulate the swap without executing it (default: true)",
              default: true,
            },
          },
          required: ["fromToken", "toToken", "amount"],
        },
      },
      {
        name: "x402_pay",
        description: "Make a stablecoin payment to an x402-enabled URL endpoint using the x402 payment protocol via Thirdweb.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL of the x402-enabled endpoint to pay",
            },
            maxAmountUSD: {
              type: "string",
              description: "Maximum amount in USD willing to pay e.g. '0.10'",
            },
            token: {
              type: "string",
              enum: ["USDC", "cUSD"],
              description: "The token to pay with (USDC or cUSD, default: USDC)",
              default: "USDC",
            },
            dryRun: {
              type: "boolean",
              description: "If true, simulate the payment without executing it (default: true)",
              default: true,
            },
          },
          required: ["url", "maxAmountUSD"],
        },
      },
      {
        name: "lend_on_aave",
        description: "Deposit tokens into Aave v3 on Celo to earn yield.",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              enum: ["USDC", "cUSD", "CELO"],
              description: "The token to deposit",
            },
            amount: {
              type: "string",
              description: "Amount to deposit e.g. '100'",
            },
            dryRun: {
              type: "boolean",
              description: "If true, simulate the transaction without executing it (default: true)",
              default: true,
            },
          },
          required: ["token", "amount"],
        },
      },
      {
        name: "withdraw_from_aave",
        description: "Withdraw tokens from your Aave v3 position on Celo.",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              enum: ["USDC", "cUSD", "CELO"],
              description: "The token to withdraw",
            },
            amount: {
              type: "string",
              description: "Amount to withdraw or 'max' to withdraw everything",
            },
            dryRun: {
              type: "boolean",
              description: "If true, simulate the transaction without executing it (default: true)",
              default: true,
            },
          },
          required: ["token", "amount"],
        },
      },
      {
        name: "self_verify",
        description: "Verify a user's Self Protocol credential to confirm they are a real, verified human.",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Celo wallet address to verify",
            },
            credentialType: {
              type: "string",
              enum: ["passport", "national_id", "drivers_license"],
              description: "The credential type to verify (default: passport)",
              default: "passport",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "check_agent_id",
        description: "Look up a Self Agent ID for any Celo agent to verify it is a legitimate registered agent.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "Self Agent ID to look up",
            },
            address: {
              type: "string",
              description: "Celo wallet address of the agent",
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

  if (name === "send_tokens") {
    try {
      const args = SendTokensSchema.parse(request.params.arguments);
      const result = await sendTokens(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running send_tokens tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing token send: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "swap_tokens") {
    try {
      const args = SwapTokensSchema.parse(request.params.arguments);
      const result = await swapTokens(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running swap_tokens tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing swap: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "x402_pay") {
    try {
      const args = X402PaySchema.parse(request.params.arguments);
      const result = await x402Pay(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running x402_pay tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing x402 payment: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "lend_on_aave") {
    try {
      const args = LendOnAaveSchema.parse(request.params.arguments);
      const result = await lendOnAave(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running lend_on_aave tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error lending on Aave: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "withdraw_from_aave") {
    try {
      const args = WithdrawFromAaveSchema.parse(request.params.arguments);
      const result = await withdrawFromAave(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running withdraw_from_aave tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error withdrawing from Aave: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "self_verify") {
    try {
      const args = SelfVerifySchema.parse(request.params.arguments);
      const result = await selfVerify(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running self_verify tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error verifying Self credential: ${error?.message || String(error)}`,
          },
        ],
      };
    }
  }

  if (name === "check_agent_id") {
    try {
      const args = CheckAgentIdSchema.parse(request.params.arguments);
      const result = await checkAgentId(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error running check_agent_id tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error checking Self Agent ID: ${error?.message || String(error)}`,
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
