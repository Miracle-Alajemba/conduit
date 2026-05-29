import { z } from "zod";
import { formatUnits } from "viem";
import { publicClient } from "../client.js";

export const GetBalanceSchema = z.object({
  address: z.string().describe("Celo wallet address (0x...)"),
  tokens: z.array(z.enum(["CELO", "USDC", "cUSD", "cKES", "cEUR"])).optional().default(["CELO", "USDC", "cUSD"])
});

export type GetBalanceInput = z.infer<typeof GetBalanceSchema>;

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

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

export async function getBalance(args: GetBalanceInput) {
  const { address, tokens = ["CELO", "USDC", "cUSD"] } = args;
  const formattedAddress = address.startsWith("0x") ? (address as `0x${string}`) : (`0x${address}` as `0x${string}`);

  const balances: { token: string; balance: string; decimals: number }[] = [];

  for (const token of tokens) {
    try {
      if (token === "CELO") {
        const rawBalance = await publicClient.getBalance({ address: formattedAddress });
        balances.push({
          token: "CELO",
          balance: formatUnits(rawBalance, TOKEN_DECIMALS.CELO),
          decimals: TOKEN_DECIMALS.CELO,
        });
      } else {
        const tokenAddress = TOKEN_ADDRESSES[token];
        const decimals = TOKEN_DECIMALS[token];
        
        const rawBalance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [formattedAddress],
        });

        balances.push({
          token,
          balance: formatUnits(rawBalance, decimals),
          decimals,
        });
      }
    } catch (error: any) {
      console.error(`Error fetching balance for ${token}:`, error);
      balances.push({
        token,
        balance: "0",
        decimals: TOKEN_DECIMALS[token],
      });
    }
  }

  return {
    address,
    balances,
  };
}
