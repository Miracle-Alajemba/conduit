import { walletClient, publicClient } from '../client.js'
import { parseUnits, formatUnits } from 'viem'
import { z } from 'zod'

const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC:  '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  cUSD:  '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  cKES:  '0x456a3D042C0DbD3db53D5489e98dFb038553B0d0',
  cEUR:  '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
  CELO:  '0x471EcE3750Da237f93B8E339c536989b8978a438',
}

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6, cUSD: 18, cKES: 18, cEUR: 18, CELO: 18
}

const MENTO_BROKER = '0x777A8255cA72412f0d706dc03C9D1987306B4CaD' as const
const EXCHANGE_PROVIDER = '0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901' as const

const BROKER_ABI = [
  {
    name: 'getAmountOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'exchangeProvider', type: 'address' },
      { name: 'exchangeId', type: 'bytes32' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }]
  },
  {
    name: 'swapIn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'exchangeProvider', type: 'address' },
      { name: 'exchangeId', type: 'bytes32' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }]
  }
] as const

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const

const EXCHANGE_IDS: Record<string, `0x${string}`> = {
  'CELO-cUSD': '0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c',
  'cUSD-CELO': '0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c',
  'USDC-cUSD': '0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c',
  'cUSD-USDC': '0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c',
  'cUSD-cKES': '0x0000000000000000000000000000000000000000000000000000000000000001',
  'cKES-cUSD': '0x0000000000000000000000000000000000000000000000000000000000000001',
  'cUSD-cEUR': '0x0000000000000000000000000000000000000000000000000000000000000002',
  'cEUR-cUSD': '0x0000000000000000000000000000000000000000000000000000000000000002',
}

export const swapTokensSchema = z.object({
  fromToken: z.enum(['CELO', 'USDC', 'cUSD', 'cKES', 'cEUR']),
  toToken: z.enum(['CELO', 'USDC', 'cUSD', 'cKES', 'cEUR']),
  amount: z.string().describe('Amount of fromToken to swap e.g. 10.5'),
  slippageTolerance: z.number().min(0.1).max(5).optional().default(0.5),
  dryRun: z.boolean().optional().default(true)
})
export const SwapTokensSchema = swapTokensSchema

export async function swapTokens(params: z.infer<typeof swapTokensSchema>) {
  if (params.fromToken === params.toToken) {
    throw new Error('fromToken and toToken must be different')
  }

  if (!walletClient) {
    return { error: 'No private key configured. Please add your PRIVATE_KEY in .env' }
  }

  try {
    const fromDecimals = TOKEN_DECIMALS[params.fromToken]
    const toDecimals = TOKEN_DECIMALS[params.toToken]
    const amountIn = parseUnits(params.amount, fromDecimals)
    const pairKey = `${params.fromToken}-${params.toToken}`
    const exchangeId = EXCHANGE_IDS[pairKey]

    if (!exchangeId) {
      return {
        error: `Swap pair ${params.fromToken} → ${params.toToken} not supported. Try routing through cUSD first.`
      }
    }

    const amountOut = await publicClient.readContract({
      address: MENTO_BROKER,
      abi: BROKER_ABI,
      functionName: 'getAmountOut',
      args: [EXCHANGE_PROVIDER, exchangeId, TOKEN_ADDRESSES[params.fromToken], TOKEN_ADDRESSES[params.toToken], amountIn]
    })

    const slippageMultiplier = 1 - (params.slippageTolerance / 100)
    const amountOutMin = BigInt(Math.floor(Number(amountOut) * slippageMultiplier))
    const estimatedOut = formatUnits(amountOut, toDecimals)
    const minimumOut = formatUnits(amountOutMin, toDecimals)

    if (params.dryRun) {
      return {
        simulation: true,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amountIn: params.amount,
        estimatedAmountOut: estimatedOut,
        minimumAmountOut: minimumOut,
        slippageTolerance: `${params.slippageTolerance}%`,
        warning: 'Set dryRun: false to execute this swap for real.'
      }
    }

    const [account] = await walletClient.getAddresses()

    await walletClient.writeContract({
      address: TOKEN_ADDRESSES[params.fromToken],
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [MENTO_BROKER, amountIn],
      account
    })

    const hash = await walletClient.writeContract({
      address: MENTO_BROKER,
      abi: BROKER_ABI,
      functionName: 'swapIn',
      args: [EXCHANGE_PROVIDER, exchangeId, TOKEN_ADDRESSES[params.fromToken], TOKEN_ADDRESSES[params.toToken], amountIn, amountOutMin],
      account
    })

    return {
      success: true,
      txHash: hash,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${hash}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amountIn: params.amount,
      amountOut: estimatedOut
    }
  } catch (error: any) {
    return { error: `Error executing swap: ${error.message}` }
  }
}
