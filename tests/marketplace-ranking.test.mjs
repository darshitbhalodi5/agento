import assert from 'node:assert/strict'
import test from 'node:test'
import { computeMarketplaceRankings } from '../dist/services/marketplace-ranking.js'

test('marketplace ranking prefers higher success and lower price/latency', () => {
  const rankings = computeMarketplaceRankings([
    {
      id: 'svc-a',
      priceAtomic: '1000',
      totalRuns: 10,
      successRuns: 10,
      medianLatencyMs: 100,
    },
    {
      id: 'svc-b',
      priceAtomic: '2000',
      totalRuns: 10,
      successRuns: 5,
      medianLatencyMs: 600,
    },
  ])

  const a = rankings.get('svc-a')
  const b = rankings.get('svc-b')

  assert.ok(a)
  assert.ok(b)
  assert.ok(a.rankScore > b.rankScore)
})

test('marketplace ranking is deterministic for identical input', () => {
  const input = [
    {
      id: 'svc-1',
      priceAtomic: '1500',
      totalRuns: 9,
      successRuns: 7,
      medianLatencyMs: 210,
    },
    {
      id: 'svc-2',
      priceAtomic: '1500',
      totalRuns: 9,
      successRuns: 7,
      medianLatencyMs: 210,
    },
  ]

  const first = computeMarketplaceRankings(input)
  const second = computeMarketplaceRankings(input)

  assert.deepEqual(first.get('svc-1'), second.get('svc-1'))
  assert.deepEqual(first.get('svc-2'), second.get('svc-2'))
})

test('marketplace ranking handles empty history with bounded score', () => {
  const rankings = computeMarketplaceRankings([
    {
      id: 'svc-empty',
      priceAtomic: '1000',
      totalRuns: 0,
      successRuns: 0,
      medianLatencyMs: null,
    },
  ])

  const row = rankings.get('svc-empty')
  assert.ok(row)
  assert.ok(row.rankScore >= 0 && row.rankScore <= 100)
})

