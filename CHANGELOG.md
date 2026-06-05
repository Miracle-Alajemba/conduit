# Changelog

All notable changes to conduit are documented here.

## v1.1.0 — June 2026

### Added
- `get_network_status` tool — check Celo network health, block number, and gas price
- `get_aave_positions` tool — view full Aave v3 position including deposits, debt, and health factor
- Interactive demo UI at https://useconduit.vercel.app
- How it works section on landing page
- Chainstack RPC recommendation for production use

### Improved
- Better error messages across all write tools
- Updated README with live demo link and 8004scan agent link

## v1.0.0 — May 2026

### Added
- Initial release with 11 tools
- `ping` — Celo connectivity test
- `get_balance` — multi-token balance checker
- `get_transactions` — wallet transaction history
- `get_token_price` — live prices via CoinGecko
- `send_tokens` — send CELO and ERC-20 tokens
- `swap_tokens` — Mento protocol swaps
- `x402_pay` — x402 stablecoin payments
- `lend_on_aave` — Aave v3 deposits
- `withdraw_from_aave` — Aave v3 withdrawals
- `self_verify` — Self Protocol credential verification
- `check_agent_id` — Self Agent ID lookup
- ERC-8004 agent registration (agentId: 9188)
- Published to npm as conduit-celo
