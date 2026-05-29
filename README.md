# celo-mcp

A TypeScript Model Context Protocol (MCP) server for interacting with the **Celo Blockchain**. This server exposes tools to LLMs (like Claude) for checking balances, looking up transactions, querying prices, transferring tokens, swapping on Mento, and interacting with lending protocols (like Aave).

## Project Status

- **Phase 1 (Completed)**: Core setup with TypeScript `NodeNext` support, Viem Celo client configuration, and a working `ping` connectivity tool.

---

## Project Structure

```text
celo-mcp/
├── dist/                  # Compiled JavaScript output
├── src/
│   ├── index.ts          # MCP server entry point & tool registration
│   ├── client.ts         # Viem Celo public & wallet client setup
│   └── tools/            # (Placeholder folders for Phase 2 tools)
│       ├── get_balance.ts
│       ├── get_transactions.ts
│       ├── get_token_price.ts
│       ├── send_tokens.ts
│       ├── swap_tokens.ts
│       ├── x402_pay.ts
│       ├── lend_on_aave.ts
│       ├── withdraw_from_aave.ts
│       ├── self_verify.ts
│       └── check_agent_id.ts
├── .env.example          # Environment variable template
├── .env                  # Environment variables (gitignored)
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependency and script management
└── README.md             # Project documentation
```

---

## Setup & Installation

### 1. Requirements
* Node.js (v18+)
* npm

### 2. Install Dependencies
Clone or navigate to the directory and run:
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill out your details:
```bash
cp .env.example .env
```

Configuration variables:
* `CELO_RPC_URL`: The RPC endpoint for Celo mainnet (defaults to `https://forno.celo.org`).
* `PRIVATE_KEY`: Your wallet private key (used for transaction tools in Phase 2).
* `WALLET_ADDRESS`: Your wallet public address.
* `CELO_EXPLORER_API`: API URL for block explorer requests.
* `SELF_API_KEY`: API Key for Self Protocol identity validation tools.

---

## Build & Run

### Build the server:
```bash
npm run build
```

### Run the server (stdio):
```bash
npm run start
```

### Run in watch/development mode:
```bash
npm run dev
```

---

## Tools

### Core Tools (Phase 1)
- **`ping`**: Verification tool that connects to the Celo network, retrieves the latest block number, and returns server status.

---

## Claude Desktop Configuration

To run this MCP server within Claude Desktop, add the following to your Claude Desktop configuration file (typically found at `~/.config/Claude/claude_desktop_config.json` on Linux/macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "celo-mcp": {
      "command": "node",
      "args": [
        "/home/miracle-alajemba/.gemini/antigravity/scratch/celo-mcp/dist/index.js"
      ],
      "env": {
        "CELO_RPC_URL": "https://forno.celo.org",
        "PRIVATE_KEY": "your_wallet_private_key_here"
      }
    }
  }
}
```

Replace the paths and environment variables with your actual configuration.
