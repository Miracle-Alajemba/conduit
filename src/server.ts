import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { publicClient } from './client.js'
import { getBalance } from './tools/get_balance.js'
import { getTransactions } from './tools/get_transactions.js'
import { getTokenPrice } from './tools/get_token_price.js'
import { sendTokens } from './tools/send_tokens.js'
import { swapTokens } from './tools/swap_tokens.js'
import { lendOnAave } from './tools/lend_on_aave.js'
import { selfVerify } from './tools/self_verify.js'
import { checkAgentId } from './tools/check_agent_id.js'
import { x402Pay } from './tools/x402_pay.js'
import { getNetworkStatus } from './tools/get_network_status.js'
import { getAavePositions } from './tools/get_aave_positions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

app.get('/api/status', async (req, res) => {
  try {
    const blockNumber = await publicClient.getBlockNumber()
    res.json({ status: 'ok', blockNumber: blockNumber.toString() })
  } catch {
    res.status(500).json({ status: 'error' })
  }
})

app.post('/api/tool', async (req, res) => {
  const { tool, params } = req.body
  try {
    let result
    switch (tool) {
      case 'ping':
        const block = await publicClient.getBlockNumber()
        result = { status: 'ok', chain: 'celo', blockNumber: block.toString() }
        break
      case 'get_balance': result = await getBalance(params); break
      case 'get_aave_positions': result = await getAavePositions(params); break
      case 'get_network_status': result = await getNetworkStatus(); break
      case 'get_transactions': result = await getTransactions(params); break
      case 'get_token_price': result = await getTokenPrice(params); break
      case 'send_tokens': result = await sendTokens(params); break
      case 'swap_tokens': result = await swapTokens(params); break
      case 'lend_on_aave': result = await lendOnAave(params); break
      case 'self_verify': result = await selfVerify(params); break
      case 'check_agent_id': result = await checkAgentId(params); break
      case 'x402_pay': result = await x402Pay(params); break
      default: result = { error: 'Tool not found' }
    }
    res.json(result)
  } catch (err: any) {
    res.json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`conduit demo running at http://localhost:${PORT}`)
})
