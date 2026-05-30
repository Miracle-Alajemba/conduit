import { z } from "zod";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { publicClient, walletClient } from "../client.js";
import {
  AAVE_ADDRESSES,
  AAVE_POOL_ABI,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  ERC20_ABI
} from "./lend_on_aave.js";

export const WithdrawFromAaveSchema = z.object({
  token: z.enum(["USDC", "cUSD", "CELO"]),
  amount: z.string().describe("Amount to withdraw or 'max' to withdraw everything"),
  dryRun: z.boolean().optional().default(true)
});

export type WithdrawFromAaveInput = z.infer<typeof WithdrawFromAaveSchema>;

const AAVE_WITHDRAW_ABI = [
  ...AAVE_POOL_ABI,
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export async function withdrawFromAave(args: WithdrawFromAaveInput) {
  const { token, amount, dryRun = true } = args;

  const account = walletClient.account;
  if (!account) {
    throw new Error("No private key or wallet account configured in the MCP server. Please add your PRIVATE_KEY in .env");
  }

  const userAddress = account.address;
  const tokenAddress = TOKEN_ADDRESSES[token];
  const decimals = TOKEN_DECIMALS[token];

  // 1. Fetch the aToken address dynamically using getReserveData
  let aTokenAddress: `0x${string}`;
  try {
    const reserveData = await publicClient.readContract({
      address: AAVE_ADDRESSES.POOL,
      abi: AAVE_WITHDRAW_ABI,
      functionName: "getReserveData",
      args: [tokenAddress]
    });
    aTokenAddress = reserveData[8] as `0x${string}`;
  } catch (error: any) {
    console.error("Failed to query getReserveData for aTokenAddress:", error);
    // Hardcoded fallbacks if onchain query fails
    if (token === "USDC") aTokenAddress = AAVE_ADDRESSES.aUSDC;
    else if (token === "cUSD") aTokenAddress = AAVE_ADDRESSES.acUSD;
    else throw new Error(`Failed to find aToken contract address for ${token}: ${error?.message || String(error)}`);
  }

  // 2. Fetch current deposit balance
  let currentBalanceWei = 0n;
  try {
    currentBalanceWei = await publicClient.readContract({
      address: aTokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userAddress]
    });
  } catch (error: any) {
    console.error("Failed to query user aToken balance:", error);
  }

  const currentDepositBalance = formatUnits(currentBalanceWei, decimals);

  // 3. Determine the amount to withdraw
  let parsedAmount: bigint;
  let displayAmount: string;

  if (amount.toLowerCase() === "max") {
    parsedAmount = maxUint256;
    displayAmount = currentDepositBalance;
  } else {
    parsedAmount = parseUnits(amount, decimals);
    displayAmount = amount;
    
    if (parsedAmount > currentBalanceWei) {
      throw new Error(`Insufficient deposit balance. Requested to withdraw ${amount} ${token}, but current balance is ${currentDepositBalance} ${token}`);
    }
  }

  if (dryRun) {
    return {
      simulation: true,
      token,
      currentDepositBalance,
      amountToWithdraw: displayAmount,
      warning: "Set dryRun: false to withdraw for real."
    };
  }

  // 4. Real transaction: call withdraw
  try {
    console.error(`[Aave Withdraw] Withdrawing ${displayAmount} ${token} from Aave Pool...`);
    const withdrawTx = await walletClient.writeContract({
      account,
      address: AAVE_ADDRESSES.POOL,
      abi: AAVE_WITHDRAW_ABI,
      functionName: "withdraw",
      args: [tokenAddress, parsedAmount, userAddress]
    });
    console.error(`[Aave Withdraw] Transaction sent: ${withdrawTx}. Waiting for confirmation...`);
    await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

    return {
      success: true,
      txHash: withdrawTx,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${withdrawTx}`,
      token,
      amountWithdrawn: displayAmount
    };
  } catch (error: any) {
    console.error("Execution error in withdrawFromAave:", error);
    throw new Error(`Aave withdraw failed: ${error?.message || String(error)}`);
  }
}
