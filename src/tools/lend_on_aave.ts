import { walletClient, publicClient } from '../client.js'
import { parseUnits, formatUnits } from 'viem'
import { z } from 'zod'

const AAVE_POOL = '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402' as const

const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438',
}

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6, cUSD: 18, CELO: 18
}

const AAVE_POOL_ABI = [
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' }
    ],
    outputs: []
  },
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' }
    ]
  }
] as const

const ERC20_ABI = [
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

export const lendOnAaveSchema = z.object({
  token: z.enum(['USDC', 'cUSD', 'CELO']),
  amount: z.string().describe('Amount to deposit e.g. 100'),
  dryRun: z.boolean().optional().default(true)
})
export const LendOnAaveSchema = lendOnAaveSchema

export async function lendOnAave(params: z.infer<typeof lendOnAaveSchema>) {
  if (!walletClient) {
    return { error: 'No private key configured. Please add your PRIVATE_KEY in .env' }
  }

  try {
    const [account] = await walletClient.getAddresses()
    const decimals = TOKEN_DECIMALS[params.token]
    const amount = parseUnits(params.amount, decimals)

    const accountData = await publicClient.readContract({
      address: AAVE_POOL,
      abi: AAVE_POOL_ABI,
      functionName: 'getUserAccountData',
      args: [account]
    })

    const [totalCollateralBase, totalDebtBase, , , , healthFactor] = accountData
    const healthFactorFormatted = healthFactor === BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')
      ? '∞'
      : parseFloat(formatUnits(healthFactor, 18)).toFixed(2)

    if (params.dryRun) {
      return {
        simulation: true,
        token: params.token,
        amount: params.amount,
        currentPosition: {
          totalCollateralUSD: parseFloat(formatUnits(totalCollateralBase, 8)).toFixed(2),
          totalDebtUSD: parseFloat(formatUnits(totalDebtBase, 8)).toFixed(2),
          healthFactor: healthFactorFormatted
        },
        warning: 'Set dryRun: false to deposit for real.'
      }
    }

    await walletClient.writeContract({
      address: TOKEN_ADDRESSES[params.token],
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AAVE_POOL, amount],
      account
    })

    const hash = await walletClient.writeContract({
      address: AAVE_POOL,
      abi: AAVE_POOL_ABI,
      functionName: 'supply',
      args: [TOKEN_ADDRESSES[params.token], amount, account, 0],
      account
    })

    return {
      success: true,
      txHash: hash,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${hash}`,
      token: params.token,
      amountDeposited: params.amount
    }
  } catch (error: any) {
    return { error: `Error lending on Aave: ${error.message}` }
  }
}
