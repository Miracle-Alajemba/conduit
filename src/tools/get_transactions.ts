import { z } from "zod";

export const GetTransactionsSchema = z.object({
  address: z.string().describe("Celo wallet address"),
  limit: z.number().min(1).max(50).optional().default(10)
});

export type GetTransactionsInput = z.infer<typeof GetTransactionsSchema>;

interface ExplorerTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
  timeStamp: string;
  isError?: string;
  txreceipt_status?: string;
}

export async function getTransactions(args: GetTransactionsInput) {
  const { address, limit = 10 } = args;
  const cleanAddress = address.toLowerCase();

  const url = `https://explorer.celo.org/mainnet/api?module=account&action=txlist&address=${address}&sort=desc&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions from Celo Explorer: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== "1" || !Array.isArray(data.result)) {
      // Sometimes no transactions return status "0", which is normal
      if (data.message === "No transactions found") {
        return {
          address,
          transactions: [],
        };
      }
      throw new Error(`Explorer API error: ${data.message || "Unknown error"}`);
    }

    const transactions = data.result.map((tx: ExplorerTransaction) => {
      const fromAddr = tx.from?.toLowerCase();
      const toAddr = tx.to?.toLowerCase();
      
      let type: "send" | "receive" | "contract_interaction" = "send";
      
      if (tx.input && tx.input !== "0x") {
        type = "contract_interaction";
      } else if (toAddr === cleanAddress) {
        type = "receive";
      } else if (fromAddr === cleanAddress) {
        type = "send";
      }

      const status = (tx.isError === "1" || tx.txreceipt_status === "0") ? "failed" : "success";
      const timestamp = tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : new Date().toISOString();

      return {
        hash: tx.hash,
        type,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp,
        status,
      };
    });

    return {
      address,
      transactions,
    };
  } catch (error: any) {
    console.error("Error in getTransactions:", error);
    throw new Error(`Failed to retrieve transactions for address ${address}: ${error?.message || String(error)}`);
  }
}
