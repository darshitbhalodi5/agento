import { getActiveServicePolicy, getPolicyUsageSnapshot } from '../db/service-policies.js'

type PolicyBlockCode =
  | 'POLICY_CONSUMER_BLOCKLISTED'
  | 'POLICY_CONSUMER_NOT_ALLOWLISTED'
  | 'POLICY_MAX_CALLS_PER_MINUTE_EXCEEDED'
  | 'POLICY_MAX_SPEND_PER_HOUR_EXCEEDED'
  | 'POLICY_MAX_SPEND_PER_DAY_EXCEEDED'

export interface PolicyEvaluationInput {
  consumerId?: string
  servicePriceAtomic: string
  policy: {
    maxCallsPerMinute: number | null
    maxSpendPerHourAtomic: string | null
    maxSpendPerDayAtomic: string | null
    allowlistConsumerIds: string[]
    blocklistConsumerIds: string[]
  }
  usage: {
    callsLastMinute: number
    spendLastHourAtomic: string
    spendLastDayAtomic: string
  }
}

export type PolicyEvaluationDecision =
  | {
      allowed: true
      reason: 'NO_POLICY' | 'PASS'
    }
  | {
      allowed: false
      policyCode: PolicyBlockCode
      message: string
      details: Record<string, unknown>
    }

function normalizeConsumerId(consumerId?: string): string | null {
  if (!consumerId) {
    return null
  }

  const trimmed = consumerId.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function evaluatePolicyDecision(input: PolicyEvaluationInput): PolicyEvaluationDecision {
  const consumerId = normalizeConsumerId(input.consumerId)
  const allowlist = new Set(input.policy.allowlistConsumerIds)
  const blocklist = new Set(input.policy.blocklistConsumerIds)
  const projectedSpendHour = BigInt(input.usage.spendLastHourAtomic) + BigInt(input.servicePriceAtomic)
  const projectedSpendDay = BigInt(input.usage.spendLastDayAtomic) + BigInt(input.servicePriceAtomic)

  if (consumerId && blocklist.has(consumerId)) {
    return {
      allowed: false,
      policyCode: 'POLICY_CONSUMER_BLOCKLISTED',
      message: 'Consumer is blocked by service policy',
      details: { consumerId },
    }
  }

  if (allowlist.size > 0 && (!consumerId || !allowlist.has(consumerId))) {
    return {
      allowed: false,
      policyCode: 'POLICY_CONSUMER_NOT_ALLOWLISTED',
      message: 'Consumer is not in service allowlist',
      details: { consumerId },
    }
  }

  if (
    input.policy.maxCallsPerMinute !== null &&
    input.usage.callsLastMinute >= input.policy.maxCallsPerMinute
  ) {
    return {
      allowed: false,
      policyCode: 'POLICY_MAX_CALLS_PER_MINUTE_EXCEEDED',
      message: 'Per-minute call limit exceeded for service',
      details: {
        maxCallsPerMinute: input.policy.maxCallsPerMinute,
        callsLastMinute: input.usage.callsLastMinute,
      },
    }
  }

  if (
    input.policy.maxSpendPerHourAtomic !== null &&
    projectedSpendHour > BigInt(input.policy.maxSpendPerHourAtomic)
  ) {
    return {
      allowed: false,
      policyCode: 'POLICY_MAX_SPEND_PER_HOUR_EXCEEDED',
      message: 'Hourly spend limit exceeded for service',
      details: {
        maxSpendPerHourAtomic: input.policy.maxSpendPerHourAtomic,
        spendLastHourAtomic: input.usage.spendLastHourAtomic,
        projectedSpendHourAtomic: projectedSpendHour.toString(),
      },
    }
  }

  if (
    input.policy.maxSpendPerDayAtomic !== null &&
    projectedSpendDay > BigInt(input.policy.maxSpendPerDayAtomic)
  ) {
    return {
      allowed: false,
      policyCode: 'POLICY_MAX_SPEND_PER_DAY_EXCEEDED',
      message: 'Daily spend limit exceeded for service',
      details: {
        maxSpendPerDayAtomic: input.policy.maxSpendPerDayAtomic,
        spendLastDayAtomic: input.usage.spendLastDayAtomic,
        projectedSpendDayAtomic: projectedSpendDay.toString(),
      },
    }
  }

  return {
    allowed: true,
    reason: 'PASS',
  }
}

export async function evaluateServicePolicyForExecute(params: {
  serviceId: string
  consumerId?: string
  servicePriceAtomic: string
}): Promise<PolicyEvaluationDecision> {
  const policy = await getActiveServicePolicy(params.serviceId)

  if (!policy) {
    return {
      allowed: true,
      reason: 'NO_POLICY',
    }
  }

  const usage = await getPolicyUsageSnapshot(params.serviceId)

  return evaluatePolicyDecision({
    consumerId: params.consumerId,
    servicePriceAtomic: params.servicePriceAtomic,
    policy: {
      maxCallsPerMinute: policy.maxCallsPerMinute,
      maxSpendPerHourAtomic: policy.maxSpendPerHourAtomic,
      maxSpendPerDayAtomic: policy.maxSpendPerDayAtomic,
      allowlistConsumerIds: policy.allowlistConsumerIds,
      blocklistConsumerIds: policy.blocklistConsumerIds,
    },
    usage: {
      callsLastMinute: usage.callsLastMinute,
      spendLastHourAtomic: usage.spendLastHourAtomic,
      spendLastDayAtomic: usage.spendLastDayAtomic,
    },
  })
}

