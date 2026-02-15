import { createPublicClient, getAddress, http, keccak256, parseEventLogs, stringToHex } from 'viem'
import { env } from '../config/env.js'
import type { ServiceRecord } from '../db/services.js'
import { getSimulatedPayment } from './payment-simulator.js'

const transferWithMemoAbi = [
  {
    type: 'event',
    name: 'TransferWithMemo',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: true, name: 'memo', type: 'bytes32' },
    ],
  },
] as const

export type VerificationResult =
  | {
      ok: true
      details: {
        payer: `0x${string}`
        recipient: `0x${string}`
        amountAtomic: string
        token: `0x${string}`
        memo: `0x${string}`
      }
    }
  | {
      ok: false
      code:
        | 'PAYMENT_NOT_FOUND'
        | 'PAYMENT_TOKEN_MISMATCH'
        | 'PAYMENT_RECIPIENT_MISMATCH'
        | 'PAYMENT_INSUFFICIENT'
        | 'MEMO_MISMATCH'
      message: string
      details?: unknown
    }

const publicClient = createPublicClient({
  transport: http(env.TEMPO_RPC_URL),
})

function normalizeAddress(address: string): `0x${string}` {
  return getAddress(address)
}

function buildExpectedMemo(service: ServiceRecord, requestId: string): `0x${string}` {
  const canonical = `${service.memoPrefix}:v1:${service.id}:${requestId}`
  return keccak256(stringToHex(canonical))
}

export async function verifyPaymentTx(params: {
  paymentTxHash: `0x${string}`
  requestId: string
  service: ServiceRecord
}): Promise<VerificationResult> {
  const { paymentTxHash, requestId, service } = params
  if (env.ENABLE_PAYMENT_SIMULATION) {
    const simulated = getSimulatedPayment(paymentTxHash)
    if (simulated) {
      const serviceToken = normalizeAddress(service.tokenAddress)
      const providerWallet = normalizeAddress(service.providerWallet)
      const minAmount = BigInt(service.priceAtomic)
      const paidAmount = BigInt(simulated.amountAtomic)
      const expectedMemo = buildExpectedMemo(service, requestId)

      if (simulated.token.toLowerCase() !== serviceToken.toLowerCase()) {
        return {
          ok: false,
          code: 'PAYMENT_TOKEN_MISMATCH',
          message: 'Simulated payment token does not match configured service token',
        }
      }

      if (simulated.recipient.toLowerCase() !== providerWallet.toLowerCase()) {
        return {
          ok: false,
          code: 'PAYMENT_RECIPIENT_MISMATCH',
          message: 'Simulated payment recipient does not match configured provider wallet',
          details: {
            simulatedRecipient: simulated.recipient,
            configuredRecipient: providerWallet,
            simulatedServiceId: simulated.serviceId,
            executeServiceId: service.id,
          },
        }
      }

      if (paidAmount < minAmount) {
        return {
          ok: false,
          code: 'PAYMENT_INSUFFICIENT',
          message: 'Simulated payment amount is below service price',
          details: { paid: paidAmount.toString(), required: minAmount.toString() },
        }
      }

      if (simulated.memo.toLowerCase() !== expectedMemo.toLowerCase()) {
        return {
          ok: false,
          code: 'MEMO_MISMATCH',
          message: 'Simulated payment memo does not match expected request binding',
          details: { expectedMemo, actualMemo: simulated.memo },
        }
      }

      return {
        ok: true,
        details: {
          payer: simulated.payer,
          recipient: simulated.recipient,
          amountAtomic: simulated.amountAtomic,
          token: simulated.token,
          memo: simulated.memo,
        },
      }
    }
  }

  const receipt = await publicClient.getTransactionReceipt({ hash: paymentTxHash }).catch(() => null)

  if (!receipt || receipt.status !== 'success') {
    return {
      ok: false,
      code: 'PAYMENT_NOT_FOUND',
      message: 'Payment transaction not found or failed',
    }
  }

  const serviceToken = normalizeAddress(service.tokenAddress)
  const providerWallet = normalizeAddress(service.providerWallet)
  const minAmount = BigInt(service.priceAtomic)

  const tokenLogs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === serviceToken.toLowerCase(),
  )

  if (tokenLogs.length === 0) {
    return {
      ok: false,
      code: 'PAYMENT_TOKEN_MISMATCH',
      message: 'No matching token transfer logs found for configured service token',
    }
  }

  const parsedLogs = parseEventLogs({
    abi: transferWithMemoAbi,
    logs: tokenLogs,
    eventName: 'TransferWithMemo',
    strict: false,
  })

  if (parsedLogs.length === 0) {
    return {
      ok: false,
      code: 'MEMO_MISMATCH',
      message: 'TransferWithMemo event not found for payment transaction',
    }
  }

  const expectedMemo = buildExpectedMemo(service, requestId)

  for (const log of parsedLogs) {
    const from = log.args.from
    const to = log.args.to
    const value = log.args.value
    const memo = log.args.memo

    if (!from || !to || value === undefined || !memo) {
      continue
    }

    if (normalizeAddress(to) !== providerWallet) {
      continue
    }

    if (value < minAmount) {
      return {
        ok: false,
        code: 'PAYMENT_INSUFFICIENT',
        message: 'Payment amount is below service price',
        details: { paid: value.toString(), required: minAmount.toString() },
      }
    }

    if (memo.toLowerCase() !== expectedMemo.toLowerCase()) {
      return {
        ok: false,
        code: 'MEMO_MISMATCH',
        message: 'Payment memo does not match expected request binding',
        details: { expectedMemo, actualMemo: memo },
      }
    }

    return {
      ok: true,
      details: {
        payer: normalizeAddress(from),
        recipient: normalizeAddress(to),
        amountAtomic: value.toString(),
        token: serviceToken,
        memo,
      },
    }
  }

  return {
    ok: false,
    code: 'PAYMENT_RECIPIENT_MISMATCH',
    message: 'No matching transfer found to configured provider wallet',
  }
}
