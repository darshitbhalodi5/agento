import { randomBytes } from 'node:crypto'
import { getAddress, keccak256, stringToHex } from 'viem'
import type { ServiceRecord } from '../db/services.js'

export interface SimulatedPayment {
  paymentTxHash: `0x${string}`
  payer: `0x${string}`
  recipient: `0x${string}`
  amountAtomic: string
  token: `0x${string}`
  memo: `0x${string}`
  serviceId: string
  requestId: string
  createdAt: string
}

const simulatedPayments = new Map<`0x${string}`, SimulatedPayment>()

function normalizeAddress(address: string): `0x${string}` {
  return getAddress(address)
}

function buildExpectedMemo(service: ServiceRecord, requestId: string): `0x${string}` {
  const canonical = `${service.memoPrefix}:v1:${service.id}:${requestId}`
  return keccak256(stringToHex(canonical))
}

function randomTxHash(): `0x${string}` {
  return `0x${randomBytes(32).toString('hex')}` as `0x${string}`
}

export function createSimulatedPayment(params: {
  service: ServiceRecord
  requestId: string
  payerAddress: string
  amountAtomic: string
}): SimulatedPayment {
  const { service, requestId, payerAddress, amountAtomic } = params
  const paymentTxHash = randomTxHash()
  const payment: SimulatedPayment = {
    paymentTxHash,
    payer: normalizeAddress(payerAddress),
    recipient: normalizeAddress(service.providerWallet),
    amountAtomic,
    token: normalizeAddress(service.tokenAddress),
    memo: buildExpectedMemo(service, requestId),
    serviceId: service.id,
    requestId,
    createdAt: new Date().toISOString(),
  }
  simulatedPayments.set(paymentTxHash, payment)
  return payment
}

export function getSimulatedPayment(paymentTxHash: `0x${string}`): SimulatedPayment | null {
  return simulatedPayments.get(paymentTxHash) ?? null
}

