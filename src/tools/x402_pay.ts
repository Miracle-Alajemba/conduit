import { walletClient, publicClient } from '../client.js'
import { parseUnits, formatUnits } from 'viem'
import { z } from 'zod'

const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
}

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  cUSD: 18,
}

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const

export const x402PaySchema = z.object({
  url: z.string().url().describe('The URL of the x402-enabled endpoint'),
  maxAmountUSD: z.string().describe('Maximum amount in USD willing to pay e.g. 0.10'),
  token: z.enum(['USDC', 'cUSD']).optional().default('USDC'),
  dryRun: z.boolean().optional().default(true)
})

export const X402PaySchema = x402PaySchema;
export type X402PayInput = z.infer<typeof X402PaySchema>;

export async function x402Pay(params: z.infer<typeof x402PaySchema>) {
  if (!walletClient) {
    return {
      error: 'No private key configured. Please add your PRIVATE_KEY in .env'
    }
  }

  try {
    // Step 1: Probe the endpoint for payment requirements
    const probeResponse = await fetch(params.url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    // Check if payment is required
    if (probeResponse.status !== 402) {
      return {
        error: `URL did not return 402 Payment Required. Got: ${probeResponse.status}. This endpoint may not support x402.`
      }
    }

    // Step 2: Parse payment requirements from headers or body
    let requirements: any = {}

    const paymentHeader = probeResponse.headers.get('x-payment-requirements') ||
                         probeResponse.headers.get('www-authenticate') ||
                         probeResponse.headers.get('x-payment')

    if (paymentHeader) {
      try {
        requirements = JSON.parse(paymentHeader)
      } catch {
        requirements = { raw: paymentHeader }
      }
    } else {
      // Try parsing body
      try {
        requirements = await probeResponse.json()
      } catch {
        requirements = {}
      }
    }

    const requiredAmount = requirements.amount ||
                          requirements.maxAmountRequired ||
                          requirements.price ||
                          '0.01'

    const recipient = requirements.recipient ||
                     requirements.to ||
                     requirements.address ||
                     null

    // Step 3: Check if amount is within user's limit
    if (parseFloat(requiredAmount) > parseFloat(params.maxAmountUSD)) {
      return {
        error: `Payment required (${requiredAmount} USD) exceeds your maxAmountUSD (${params.maxAmountUSD}). Aborting.`
      }
    }

    // Step 4: Return simulation if dryRun
    if (params.dryRun) {
      return {
        simulation: true,
        url: params.url,
        paymentRequired: {
          amount: requiredAmount,
          token: params.token,
          recipient: recipient || 'Retrieved from endpoint'
        },
        withinBudget: parseFloat(requiredAmount) <= parseFloat(params.maxAmountUSD),
        warning: 'Set dryRun: false to execute this payment for real.'
      }
    }

    // Step 5: Execute real payment if recipient is known
    if (!recipient) {
      return {
        error: 'Could not determine payment recipient from x402 endpoint response.'
      }
    }

    const decimals = TOKEN_DECIMALS[params.token]
    const amount = parseUnits(requiredAmount, decimals)
    const [account] = await walletClient.getAddresses()

    const hash = await walletClient.writeContract({
      address: TOKEN_ADDRESSES[params.token],
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, amount],
      account
    })

    return {
      success: true,
      txHash: hash,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${hash}`,
      url: params.url,
      amountPaid: requiredAmount,
      token: params.token
    }

  } catch (error: any) {
    return {
      error: `Error executing x402 payment: ${error.message}`
    }
  }
}
