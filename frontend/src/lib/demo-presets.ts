export interface DemoWalkthroughStep {
  id: string
  title: string
  description: string
  href: string
}

export const demoWalkthroughSteps: DemoWalkthroughStep[] = [
  {
    id: 'payments',
    title: 'Payments Flow',
    description: 'Run quote, execute, and request-status with happy/error presets.',
    href: '/payments',
  },
  {
    id: 'registry',
    title: 'Registry Flow',
    description: 'Show discovery filters, ranking sort, and role-protected writes.',
    href: '/registry',
  },
  {
    id: 'orchestrations',
    title: 'Orchestration Flow',
    description: 'Enqueue a run, inspect history, and open summary/timeline evidence.',
    href: '/orchestrations',
  },
  {
    id: 'observability',
    title: 'Observability Flow',
    description: 'Review metrics cards and backend dashboard links for operator evidence.',
    href: '/observability',
  },
]

export const registryDemoDefaults = {
  writeRole: 'provider' as const,
}

export const orchestrationDemoPresets = {
  happy: {
    runIdPrefix: 'run_happy',
    workflowId: 'wf_agent_commerce_demo',
  },
  error: {
    runIdPrefix: 'run_error',
    workflowId: 'wf_agent_commerce_demo',
  },
}
