import { walletClient, publicClient } from '../client.js'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { z } from 'zod'

const AAVE_POOL = '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402' as const

const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438',
}

const ATOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC: '0xf3b1c89A6C15b1C8F1BeDD03B0C2e9CBF54E8b5a',
  cUSD: '0x3b9C19d4e7e5B38a1B7D63F3c5a3c3C8f5e4D2e1',
  CELO: '0x0000000000000000000000000000000000000000',
}

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6, cUSD: 18, CELO: 18
}

const AAVE_POOL_ABI = [
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
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

export const withdrawFromAaveSchema = z.object({
  token: z.enum(['USDC', 'cUSD', 'CELO']),
  amount: z.string().describe('Amount to withdraw or max to withdraw everything'),
  dryRun: z.boolean().optional().default(true)
})
export const WithdrawFromAaveSchema = withdrawFromAaveSchema

export async function withdrawFromAave(params: z.infer<typeof withdrawFromAaveSchema>) {
  if (!walletClient) {
    return { error: 'No private key configured. Please add your PRIVATE_KEY in .env' }
  }

  try {
    const [account] = await walletClient.getAddresses()
    const decimals = TOKEN_DECIMALS[params.token]

    const aTokenBalance = await publicClient.readContract({
      address: ATOKEN_ADDRESSES[params.token],
      abi: ATOKEN_ABI,
      functionName: 'balanceOf',
      args: [account]
    })

    const currentBalance = formatUnits(aTokenBalance, decimals)
    const withdrawAmount = params.amount === 'max' ? maxUint256 : parseUnits(params.amount, decimals)
    const withdrawDisplay = params.amount === 'max' ? currentBalance : params.amount

    if (params.dryRun) {
      return {
        simulation: true,
        token: params.token,
        currentDepositBalance: currentBalance,
        amountToWithdraw: withdrawDisplay,
        warning: 'Set dryRun: false to withdraw for real.'
      }
    }

    const hash = await walletClient.writeContract({
      address: AAVE_POOL,
      abi: AAVE_POOL_ABI,
      functionName: 'withdraw',
      args: [TOKEN_ADDRESSES[params.token], withdrawAmount, account],
      account
    })

    return {
      success: true,
      txHash: hash,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${hash}`,
      token: params.token,
      amountWithdrawn: withdrawDisplay
    }
  } catch (error: any) {
    return { error: `Error withdrawing from Aave: ${error.message}` }
  }
}
