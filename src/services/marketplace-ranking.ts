export interface MarketplaceRankingInput {
  id: string
  priceAtomic: string
  totalRuns: number
  successRuns: number
  medianLatencyMs: number | null
}

export interface MarketplaceRankingBreakdown {
  successScore: number
  latencyScore: number
  priceScore: number
}

export interface MarketplaceRankingResult {
  id: string
  rankScore: number
  breakdown: MarketplaceRankingBreakdown
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeMarketplaceRankings(services: MarketplaceRankingInput[]): Map<string, MarketplaceRankingResult> {
  if (services.length === 0) {
    return new Map()
  }

  const prices = services.map((service) => BigInt(service.priceAtomic))
  const latencies = services
    .map((service) => service.medianLatencyMs)
    .filter((value): value is number => value !== null && Number.isFinite(value))

  const minPrice = prices.reduce((acc, value) => (value < acc ? value : acc), prices[0])
  const maxPrice = prices.reduce((acc, value) => (value > acc ? value : acc), prices[0])
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : null
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : null

  const results = new Map<string, MarketplaceRankingResult>()

  for (const service of services) {
    const successRate = service.totalRuns > 0 ? service.successRuns / service.totalRuns : 0
    const successScore = clamp(successRate * 100, 0, 100)

    let latencyScore = 50
    if (service.medianLatencyMs !== null && minLatency !== null && maxLatency !== null) {
      if (maxLatency === minLatency) {
        latencyScore = 100
      } else {
        latencyScore = clamp(((maxLatency - service.medianLatencyMs) / (maxLatency - minLatency)) * 100, 0, 100)
      }
    }

    const price = BigInt(service.priceAtomic)
    let priceScore = 100
    if (maxPrice !== minPrice) {
      const scaled = ((maxPrice - price) * 10000n) / (maxPrice - minPrice)
      priceScore = clamp(Number(scaled) / 100, 0, 100)
    }

    // Weighted score tuned for discovery quality: reliability > latency > price.
    const rankScore = round2(successScore * 0.5 + latencyScore * 0.3 + priceScore * 0.2)

    results.set(service.id, {
      id: service.id,
      rankScore,
      breakdown: {
        successScore: round2(successScore),
        latencyScore: round2(latencyScore),
        priceScore: round2(priceScore),
      },
    })
  }

  return results
}
