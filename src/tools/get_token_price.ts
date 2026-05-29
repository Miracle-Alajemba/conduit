import { z } from "zod";

export const GetTokenPriceSchema = z.object({
  tokens: z.array(z.enum(["CELO", "USDC", "cUSD", "cKES", "cEUR"])).optional().default(["CELO"])
});

export type GetTokenPriceInput = z.infer<typeof GetTokenPriceSchema>;

const COINGECKO_IDS = {
  CELO: "celo",
  USDC: "usd-coin",
  cUSD: "celo-dollar",
  cEUR: "celo-euro",
  cKES: "celo-kenyan-shilling"
} as const;

export async function getTokenPrice(args: GetTokenPriceInput) {
  const { tokens = ["CELO"] } = args;
  
  // Map requested tokens to CoinGecko IDs
  const coingeckoIds = tokens.map(token => COINGECKO_IDS[token]).filter(Boolean);
  const idsParam = coingeckoIds.join(",");

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;
  const timestamp = new Date().toISOString();

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko HTTP error: ${response.statusText}`);
    }

    const data = await response.json();

    const prices = tokens.map(token => {
      const cgId = COINGECKO_IDS[token];
      const priceData = data[cgId];
      const priceUSD = (priceData && typeof priceData.usd === "number") ? priceData.usd : null;

      return {
        token,
        priceUSD,
        timestamp,
      };
    });

    return {
      prices,
    };
  } catch (error: any) {
    console.error("Error fetching token prices from CoinGecko:", error);
    
    // In case of error, follow the requirement: return null for all tokens instead of throwing
    return {
      prices: tokens.map(token => ({
        token,
        priceUSD: null,
        timestamp,
      })),
    };
  }
}
