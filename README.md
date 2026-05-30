# conduit

> The missing infrastructure layer that connects any AI to the Celo blockchain.

[![npm version](https://img.shields.io/npm/v/conduit-celo.svg)](https://www.npmjs.com/package/conduit-celo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built for Celo](https://img.shields.io/badge/Built%20for-Celo-FCFF52.svg)](https://celo.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

## The problem

Every AI model — Claude, GPT, Gemini — has zero ability to interact with any blockchain out of the box. They can talk *about* crypto but cannot *touch* it. Meanwhile, developers who want to build AI agents on Celo have to manually integrate viem, Mento, Aave, and Self Protocol separately — weeks of work before writing a single line of agent logic.

**conduit solves both problems in one package.**

## What it does

conduit is a TypeScript MCP server that gives any LLM instant read and write access to the Celo blockchain. Connect Claude, GPT, or any MCP-compatible AI to Celo — check balances, send tokens, swap via Mento, lend on Aave v3, make x402 payments, and verify Self Protocol credentials, all from a single chat session.

One installation. One config. Full Celo access.

## Demo

```bash
# Install and run
npm install -g conduit-celo

# Ask Claude
"Check my Celo wallet balance"
"Swap 10 USDC to cKES"
"Deposit 50 USDC to Aave and tell me the APY"
"Verify this wallet using Self Protocol"
```

## Tools (11 total)

| Tool | Type | Description |
|------|------|-------------|
| `ping` | Read | Test connectivity and get current Celo block number |
| `get_balance` | Read | Check CELO, USDC, cUSD, cKES, cEUR balances for any address |
| `get_transactions` | Read | Fetch and classify recent wallet transactions |
| `get_token_price` | Read | Live token prices in USD via CoinGecko |
| `send_tokens` | Write | Send CELO or any ERC-20 to an address |
| `swap_tokens` | Write | Swap tokens via Mento protocol |
| `x402_pay` | Write | Make stablecoin payments to x402-enabled endpoints |
| `lend_on_aave` | Write | Deposit tokens to Aave v3 on Celo to earn yield |
| `withdraw_from_aave` | Write | Withdraw from your Aave v3 position |
| `self_verify` | Read | Verify a wallet's Self Protocol credential |
| `check_agent_id` | Read | Look up and verify a Self Agent ID |

## Why conduit matters for Celo

- **Expands the developer base** — AI developers who don't know Web3 can now build on Celo without learning blockchain development
- **Every tool call = a real transaction** — drives genuine onchain activity across the Celo ecosystem
- **Foundation for every other agent** — savings agents, remittance tools, DeFi bots, all built faster on top of conduit
- **Sybil resistance built in** — Self Protocol integration means any agent using conduit can verify real humans from day one
- **Serves MiniPay's 15M users** — AI agents built on conduit can reach real users in Nigeria, Kenya, and Ghana immediately

## Prerequisites

- Node.js 18+
- A Celo wallet private key
- Self Protocol API key (optional, for `self_verify` and `check_agent_id`)

## Installation

### Option 1: Install from npm
```bash
npm install -g conduit-celo
```

### Option 2: Clone and build
```bash
git clone https://github.com/Miracle-Alajemba/conduit
cd conduit
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

```env
CELO_RPC_URL=https://forno.celo.org
PRIVATE_KEY=your_wallet_private_key_here
WALLET_ADDRESS=your_wallet_address_here
CELO_EXPLORER_API=https://explorer.celo.org/mainnet/api
SELF_API_KEY=your_self_protocol_api_key
```

## Claude Desktop Setup

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "conduit": {
      "command": "npx",
      "args": ["conduit-celo"],
      "env": {
        "CELO_RPC_URL": "https://forno.celo.org",
        "PRIVATE_KEY": "your_private_key_here",
        "WALLET_ADDRESS": "your_wallet_address_here",
        "SELF_API_KEY": "your_self_api_key_here"
      }
    }
  }
}
```

Claude Desktop config file location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## Safety first

All write tools (`send_tokens`, `swap_tokens`, `x402_pay`, `lend_on_aave`, `withdraw_from_aave`) default to `dryRun: true`. No real transaction is sent unless you explicitly pass `dryRun: false`. Every write tool simulates first and shows you exactly what will happen before touching real funds.

## Built with

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server framework
- [viem](https://viem.sh) — Celo chain interaction
- [Mento Protocol](https://mento.org) — Token swaps
- [Aave v3](https://aave.com) — DeFi lending
- [Self Protocol](https://self.xyz) — Human verification
- [x402 / Thirdweb](https://portal.thirdweb.com/x402) — Stablecoin payments

## Roadmap

- [ ] Add Ubeswap integration for deeper liquidity
- [ ] Multi-wallet support
- [ ] Natural language transaction summaries
- [ ] MiniPay deep integration
- [ ] Agent-to-agent payment flows via x402

## Contributing

PRs welcome. Open an issue first to discuss what you'd like to change.

## License

MIT — built with ❤️ for the Celo ecosystem
