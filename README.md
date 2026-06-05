# conduit

> The missing infrastructure layer that connects any AI to the Celo blockchain.

[![npm version](https://img.shields.io/npm/v/conduit-celo.svg)](https://www.npmjs.com/package/conduit-celo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built for Celo](https://img.shields.io/badge/Built%20for-Celo-FCFF52.svg)](https://celo.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-useconduit.vercel.app-FCFF52)](https://useconduit.vercel.app)
[![npm downloads](https://img.shields.io/npm/dt/conduit-celo.svg)](https://www.npmjs.com/package/conduit-celo)
[![8004scan](https://img.shields.io/badge/8004scan-agent%209188-green)](https://8004scan.io/agents/celo/9188)

## The problem

Every AI model — Claude, GPT, Gemini — has zero ability to interact with any blockchain out of the box. They can talk *about* crypto but cannot *touch* it. Meanwhile, developers who want to build AI agents on Celo have to manually integrate viem, Mento, Aave, and Self Protocol separately — weeks of work before writing a single line of agent logic.

**conduit solves both problems in one package.**

## What it does

conduit is a TypeScript MCP server that gives any LLM instant read and write access to the Celo blockchain. Connect Claude, GPT, or any MCP-compatible AI to Celo — check balances, send tokens, swap via Mento, lend on Aave v3, make x402 payments, and verify Self Protocol credentials, all from a single chat session.

> 🌐 Live site: [https://useconduit.vercel.app](https://useconduit.vercel.app)

One installation. One config. Full Celo access.

## Demo

![conduit demo](https://raw.githubusercontent.com/Miracle-Alajemba/conduit/main/public/screenshot.png)

Try it live locally:
```bash
# Clone and install
git clone https://github.com/Miracle-Alajemba/conduit
cd conduit
npm install
npm run build

# Start the demo UI
npm run demo
```
Then open `http://localhost:3000` in your browser to see all 11 tools running live.

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

## Interactive Demo UI

conduit ships with a built in web UI for testing and demoing all 11 tools directly from your browser. No Claude Desktop or MCP Inspector needed.

Features:
- Live Celo network connection status at the bottom of the page
- All 11 tools displayed as interactive cards
- Read tools return live onchain data instantly
- Write tools default to dry run mode — safe to test without real funds
- One click copy for the npm install command
- Direct links to GitHub, npm, and agentscan

To start the demo UI:
```bash
npm run demo
```
Then open `http://localhost:3000`

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

### Option 3: Run the demo UI
```bash
git clone https://github.com/Miracle-Alajemba/conduit
cd conduit
npm install
npm run build
npm run demo
```
Open `http://localhost:3000` to interact with all 11 tools from a browser UI.

## Configuration

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

```env
# ─── RPC Configuration ───────────────────────────────────────────
# Development (free, may rate limit under heavy agent volume)
CELO_RPC_URL=https://forno.celo.org

# Production (recommended for high volume agents)
# Get a free dedicated Celo endpoint at https://chainstack.com
# CELO_RPC_URL=https://your-chainstack-endpoint-here

# ─── Wallet Configuration ────────────────────────────────────────
PRIVATE_KEY=your_wallet_private_key_here
WALLET_ADDRESS=your_wallet_address_here

# ─── API Keys ────────────────────────────────────────────────────
CELO_EXPLORER_API=https://explorer.celo.org/mainnet/api
SELF_API_KEY=your_self_protocol_api_key
```

> **Note:** For production agents handling high transaction volume,
> we recommend using a dedicated RPC endpoint via
> [Chainstack](https://chainstack.com) instead of the public Forno
> endpoint which may rate limit under heavy load.


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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start the MCP server (for Claude Desktop / MCP clients) |
| `npm run demo` | Start the browser demo UI at http://localhost:3000 |

## Links

- **GitHub:** https://github.com/Miracle-Alajemba/conduit
- **npm:** https://www.npmjs.com/package/conduit-celo
- **8004scan:** https://8004scan.io/agents/celo/9188

## Contributing

PRs welcome. Open an issue first to discuss what you'd like to change.

## License

MIT — built with ❤️ for the Celo ecosystem
