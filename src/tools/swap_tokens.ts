import { z } from "zod";
import { parseUnits, formatUnits } from "viem";
import { createRequire } from "module";
import { publicClient, walletClient } from "../client.js";

const require = createRequire(import.meta.url);
const { Mento } = require("@mento-protocol/mento-sdk");

export const SwapTokensSchema = z.object({
  fromToken: z.enum(["CELO", "USDC", "cUSD", "cKES", "cEUR"]),
  toToken: z.enum(["CELO", "USDC", "cUSD", "cKES", "cEUR"]),
  amount: z.string().describe("Amount of fromToken to swap e.g. '10.5'"),
  slippageTolerance: z.number().min(0.1).max(5).optional().default(0.5).describe("Slippage tolerance in percent"),
  dryRun: z.boolean().optional().default(true).describe("If true, simulate the transaction without executing it")
}).refine(data => data.fromToken !== data.toToken, {
  message: "fromToken and toToken must be different",
  path: ["toToken"]
});

export type SwapTokensInput = z.infer<typeof SwapTokensSchema>;

const TOKEN_ADDRESSES = {
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  cKES: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
} as const;

const TOKEN_DECIMALS = {
  CELO: 18,
  USDC: 6,
  cUSD: 18,
  cKES: 18,
  cEUR: 18,
} as const;

export async function swapTokens(args: SwapTokensInput) {
  const { fromToken, toToken, amount, slippageTolerance = 0.5, dryRun = true } = args;

  const account = walletClient.account;
  if (!account) {
    throw new Error("No private key or wallet account configured in the MCP server. Please add your PRIVATE_KEY in .env");
  }

  const senderAddress = account.address;
  const fromAddress = TOKEN_ADDRESSES[fromToken];
  const toAddress = TOKEN_ADDRESSES[toToken];
  const fromDecimals = TOKEN_DECIMALS[fromToken];
  const toDecimals = TOKEN_DECIMALS[toToken];

  const amountInParsed = parseUnits(amount, fromDecimals);

  // Initialize Mento SDK
  const mento = await Mento.create(42220, publicClient);

  // Get quote
  let expectedAmountOut: bigint;
  try {
    expectedAmountOut = await mento.quotes.getAmountOut(fromAddress, toAddress, amountInParsed);
  } catch (error: any) {
    console.error("Mento quoting failed:", error);
    throw new Error(`Failed to get Mento swap quote: ${error?.message || String(error)}. Note: Mento V3 primarily supports stablecoin-to-stablecoin pools (cUSD/cEUR/cKES/USDC).`);
  }

  // Calculate minimum amount out
  const basisPoints = BigInt(Math.floor(slippageTolerance * 100));
  const slippageMultiplier = 10000n - basisPoints;
  const amountOutMinParsed = (expectedAmountOut * slippageMultiplier) / 10000n;

  const estimatedAmountOut = formatUnits(expectedAmountOut, toDecimals);
  const minimumAmountOut = formatUnits(amountOutMinParsed, toDecimals);

  if (dryRun) {
    return {
      simulation: true,
      fromToken,
      toToken,
      amountIn: amount,
      estimatedAmountOut,
      minimumAmountOut,
      slippageTolerance: `${slippageTolerance}%`,
      warning: "Set dryRun: false to execute this swap for real."
    };
  } else {
    // Execute swap
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes in future

      // Build the Mento swap transaction
      const { approval, swap } = await mento.swap.buildSwapTransaction(
        fromAddress,
        toAddress,
        amountInParsed,
        senderAddress as `0x${string}`,
        senderAddress as `0x${string}`,
        { slippageTolerance, deadline }
      );

      // Handle token approval if required
      if (approval) {
        console.error("[Mento Swap] Sending token approval transaction...");
        const approvalHash = await walletClient.sendTransaction({
          account,
          to: approval.to as `0x${string}`,
          data: approval.data as `0x${string}`,
          value: approval.value ? BigInt(approval.value) : undefined
        });
        console.error(`[Mento Swap] Approval transaction sent: ${approvalHash}. Waiting for confirmation...`);
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      // Execute swap transaction
      console.error("[Mento Swap] Executing swap transaction...");
      const txHash = await walletClient.sendTransaction({
        account,
        to: swap.params.to as `0x${string}`,
        data: swap.params.data as `0x${string}`,
        value: swap.params.value ? BigInt(swap.params.value) : undefined
      });

      return {
        success: true,
        txHash,
        explorerUrl: `https://explorer.celo.org/mainnet/tx/${txHash}`,
        fromToken,
        toToken,
        amountIn: amount,
        amountOut: estimatedAmountOut
      };
    } catch (error: any) {
      console.error("Execution error in swapTokens:", error);
      throw new Error(`Swap execution failed: ${error?.message || String(error)}`);
    }
  }
}
