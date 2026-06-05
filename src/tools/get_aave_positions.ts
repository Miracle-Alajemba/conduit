import { publicClient } from '../client.js'
import { formatUnits } from 'viem'
import { z } from 'zod'

const AAVE_POOL = '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402' as const

const AAVE_ABI = [
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

const ATOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

const ATOKENS = {
  USDC: '0xf3b1c89A6C15b1C8F1BeDD03B0C2e9CBF54E8b5a' as const,
  cUSD: '0x3b9C19d4e7e5B38a1B7D63F3c5a3c3C8f5e4D2e1' as const,
}

export const getAavePositionsSchema = z.object({
  address: z.string().describe('Celo wallet address to check Aave positions for')
})

export async function getAavePositions(params: z.infer<typeof getAavePositionsSchema>) {
  try {
    const address = params.address as `0x${string}`

    const [
      accountData,
      usdcBalance,
      cusdBalance
    ] = await Promise.all([
      publicClient.readContract({
        address: AAVE_POOL,
        abi: AAVE_ABI,
        functionName: 'getUserAccountData',
        args: [address]
      }),
      publicClient.readContract({
        address: ATOKENS.USDC,
        abi: ATOKEN_ABI,
        functionName: 'balanceOf',
        args: [address]
      }),
      publicClient.readContract({
        address: ATOKENS.cUSD,
        abi: ATOKEN_ABI,
        functionName: 'balanceOf',
        args: [address]
      })
    ])

    const [
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor
    ] = accountData

    const healthFactorFormatted = healthFactor === BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')
      ? '∞'
      : parseFloat(formatUnits(healthFactor, 18)).toFixed(2)

    return {
      address,
      summary: {
        totalCollateralUSD: parseFloat(formatUnits(totalCollateralBase, 8)).toFixed(2),
        totalDebtUSD: parseFloat(formatUnits(totalDebtBase, 8)).toFixed(2),
        availableBorrowsUSD: parseFloat(formatUnits(availableBorrowsBase, 8)).toFixed(2),
        healthFactor: healthFactorFormatted,
        ltv: `${(Number(ltv) / 100).toFixed(0)}%`,
        liquidationThreshold: `${(Number(currentLiquidationThreshold) / 100).toFixed(0)}%`
      },
      positions: [
        {
          token: 'USDC',
          deposited: parseFloat(formatUnits(usdcBalance, 6)).toFixed(4),
          aToken: ATOKENS.USDC
        },
        {
          token: 'cUSD',
          deposited: parseFloat(formatUnits(cusdBalance, 18)).toFixed(4),
          aToken: ATOKENS.cUSD
        }
      ],
      explorerUrl: `https://explorer.celo.org/mainnet/address/${address}`
    }
  } catch (error: any) {
    return {
      error: `Failed to fetch Aave positions: ${error.message}`,
      address: params.address
    }
  }
}
