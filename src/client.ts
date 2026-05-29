import { createPublicClient, createWalletClient, http } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rpcUrl = process.env.CELO_RPC_URL || 'https://forno.celo.org';
let privateKey = process.env.PRIVATE_KEY;

// Check and format private key if necessary
if (privateKey && !privateKey.startsWith('0x') && privateKey !== 'your_wallet_private_key_here') {
  privateKey = `0x${privateKey}`;
}

const hasValidPrivateKey = privateKey && privateKey !== 'your_wallet_private_key_here' && privateKey.length >= 64;

// Initialize account if private key is available
const account = hasValidPrivateKey ? privateKeyToAccount(privateKey as `0x${string}`) : undefined;

// Export the viem public client for Celo
export const publicClient = createPublicClient({
  chain: celo,
  transport: http(rpcUrl),
});

// Export the viem wallet client for Celo
export const walletClient = createWalletClient({
  chain: celo,
  transport: http(rpcUrl),
  account: account,
});

// Log to console.error so that it doesn't interfere with the stdio channel of the MCP protocol
console.error(`[Celo Client] Public client initialized connected to ${rpcUrl}`);
if (account) {
  console.error(`[Celo Client] Wallet client initialized with address: ${account.address}`);
} else {
  console.error('[Celo Client] Wallet client initialized without an active account (private key not provided or invalid)');
}
