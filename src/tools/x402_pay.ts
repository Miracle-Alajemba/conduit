import { z } from "zod";
import { parseUnits, formatUnits } from "viem";
import { publicClient, walletClient } from "../client.js";

export const X402PaySchema = z.object({
  url: z.string().url().describe("The URL of the x402-enabled endpoint to pay"),
  maxAmountUSD: z.string().describe("Maximum amount in USD willing to pay e.g. '0.10'"),
  token: z.enum(["USDC", "cUSD"]).optional().default("USDC"),
  dryRun: z.boolean().optional().default(true).describe("If true, simulate the payment without executing it")
});

export type X402PayInput = z.infer<typeof X402PaySchema>;

const TOKEN_ADDRESSES = {
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
} as const;

const TOKEN_DECIMALS = {
  USDC: 6,
  cUSD: 18,
} as const;

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export async function x402Pay(args: X402PayInput) {
  const { url, maxAmountUSD, token = "USDC", dryRun = true } = args;

  const account = walletClient.account;
  if (!account) {
    throw new Error("No private key or wallet account configured in the MCP server. Please add your PRIVATE_KEY in .env");
  }

  const senderAddress = account.address;
  console.error(`[x402 Pay] Fetching payment requirements from: ${url}`);
  
  // Make initial call to inspect if endpoint requires payment (HTTP 402)
  let response: Response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch (error: any) {
    throw new Error(`Failed to query endpoint: ${error?.message || String(error)}`);
  }

  if (response.status !== 402) {
    return {
      success: true,
      message: `Endpoint did not require payment (HTTP ${response.status} ${response.statusText})`,
      url
    };
  }

  // Parse payment requirements from header or body
  let accepts: any[] = [];
  const paymentRequiredHeader = response.headers.get("payment-required");
  if (paymentRequiredHeader) {
    try {
      const decoded = Buffer.from(paymentRequiredHeader, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      accepts = parsed.accepts || [];
    } catch (e) {
      console.error("[x402 Pay] Failed to decode payment-required header:", e);
    }
  } else {
    try {
      const body = await response.json();
      accepts = body.accepts || [];
    } catch (e) {
      console.error("[x402 Pay] Failed to parse 402 response body as JSON:", e);
    }
  }

  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error("402 response returned no valid x402 payment requirements.");
  }

  // Find requirement matching our desired token
  const tokenAddress = TOKEN_ADDRESSES[token];
  const decimals = TOKEN_DECIMALS[token];
  const selected = accepts.find(
    (req: any) => req.asset && req.asset.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (!selected) {
    throw new Error(`No payment requirements found for token ${token} (${tokenAddress}). Supported assets: ${JSON.stringify(accepts.map(a => a.asset))}`);
  }

  const rawAmount = selected.maxAmountRequired || selected.amountRequired;
  if (!rawAmount) {
    throw new Error("Payment requirements did not specify an amount required.");
  }

  const amountBigInt = BigInt(rawAmount);
  const amountUSD = formatUnits(amountBigInt, decimals);

  // Safety guardrail: verify max amount limits
  if (Number(amountUSD) > Number(maxAmountUSD)) {
    throw new Error(`Payment required (${amountUSD} USD) exceeds your maxAmountUSD (${maxAmountUSD}). Aborting.`);
  }

  if (dryRun) {
    return {
      simulation: true,
      url,
      paymentRequired: {
        amount: amountUSD,
        token: token,
        recipient: selected.payTo
      },
      warning: "This is a simulation. Set dryRun: false to execute this payment for real."
    };
  }

  // Execute payment transaction
  try {
    console.error(`[x402 Pay] Executing transaction: sending ${amountUSD} ${token} to ${selected.payTo}`);
    
    const txHash = await walletClient.writeContract({
      account,
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [selected.payTo as `0x${string}`, amountBigInt]
    });

    console.error(`[x402 Pay] Transaction sent: ${txHash}. Waiting for confirmation...`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      success: true,
      txHash,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${txHash}`,
      url,
      amountPaid: amountUSD,
      token
    };
  } catch (error: any) {
    console.error("Execution error in x402Pay:", error);
    throw new Error(`x402 Payment execution failed: ${error?.message || String(error)}`);
  }
}
