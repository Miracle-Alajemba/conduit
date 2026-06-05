import { publicClient } from '../client.js'
import { formatUnits } from 'viem'

export async function getNetworkStatus() {
  try {
    const [blockNumber, gasPrice] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getGasPrice()
    ])

    const gasPriceGwei = formatUnits(gasPrice, 9)
    const gasPriceCELO = formatUnits(gasPrice, 18)

    return {
      status: 'healthy',
      network: 'celo',
      chainId: 42220,
      blockNumber: blockNumber.toString(),
      gasPrice: {
        gwei: parseFloat(gasPriceGwei).toFixed(4),
        celo: parseFloat(gasPriceCELO).toFixed(8)
      },
      rpcEndpoint: process.env.CELO_RPC_URL || 'https://forno.celo.org',
      explorerUrl: 'https://explorer.celo.org',
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    return {
      status: 'unhealthy',
      network: 'celo',
      error: error.message,
      suggestion: 'Try switching to a Chainstack RPC endpoint for better reliability',
      timestamp: new Date().toISOString()
    }
  }
}
