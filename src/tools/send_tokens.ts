import { z } from "zod";
import { parseUnits, formatUnits } from "viem";
import { publicClient, walletClient } from "../client.js";

export const SendTokensSchema = z.object({
  to: z.string().describe("Recipient Celo address (0x...)"),
  token: z.enum(["CELO", "USDC", "cUSD", "cKES", "cEUR"]),
  amount: z.string().describe("Amount to send as a string e.g. '10.5'"),
  dryRun: z.boolean().optional().default(true).describe("If true, simulate the transaction without executing it")
});

export type SendTokensInput = z.infer<typeof SendTokensSchema>;

const TOKEN_ADDRESSES = {
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

const erc20TransferAbi = [
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

export async function sendTokens(args: SendTokensInput) {
  const { to, token, amount, dryRun = true } = args;

  const account = walletClient.account;
  if (!account) {
    throw new Error("No private key or wallet account configured in the MCP server. Please add your PRIVATE_KEY in .env");
  }

  const senderAddress = account.address;
  const formattedTo = to.startsWith("0x") ? (to as `0x${string}`) : (`0x${to}` as `0x${string}`);
  const decimals = TOKEN_DECIMALS[token];
  const parsedAmount = parseUnits(amount, decimals);

  if (dryRun) {
    try {
      let gasEstimate: bigint;
      if (token === "CELO") {
        gasEstimate = await publicClient.estimateGas({
          account,
          to: formattedTo,
          value: parsedAmount
        });
      } else {
        const tokenAddress = TOKEN_ADDRESSES[token];
        gasEstimate = await publicClient.estimateContractGas({
          account,
          address: tokenAddress,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [formattedTo, parsedAmount]
        });
      }

      const gasPrice = await publicClient.getGasPrice();
      const estimatedFeeWei = gasEstimate * gasPrice;

      return {
        simulation: true,
        token,
        amount,
        to,
        from: senderAddress,
        estimatedGas: gasEstimate.toString(),
        estimatedFeeCELO: formatUnits(estimatedFeeWei, 18),
        warning: "This is a simulation. Set dryRun: false to execute for real."
      };
    } catch (error: any) {
      console.error("Simulation error in sendTokens:", error);
      throw new Error(`Simulation failed: ${error?.message || String(error)}`);
    }
  } else {
    // Real execution
    try {
      let txHash: string;
      if (token === "CELO") {
        txHash = await walletClient.sendTransaction({
          account,
          to: formattedTo,
          value: parsedAmount
        });
      } else {
        const tokenAddress = TOKEN_ADDRESSES[token];
        txHash = await walletClient.writeContract({
          account,
          address: tokenAddress,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [formattedTo, parsedAmount]
        });
      }

      return {
        success: true,
        txHash,
        explorerUrl: `https://explorer.celo.org/mainnet/tx/${txHash}`,
        token,
        amount,
        to
      };
    } catch (error: any) {
      console.error("Execution error in sendTokens:", error);
      throw new Error(`Transaction execution failed: ${error?.message || String(error)}`);
    }
  }
}
