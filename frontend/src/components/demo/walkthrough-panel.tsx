import Link from 'next/link'
import { demoWalkthroughSteps } from '../../lib/demo-presets'

export function WalkthroughPanel() {
  return (
    <section className="card">
      <h2>Guided Demo Checklist</h2>
      <p className="subtitle">Suggested 3-5 minute judge flow. Follow these in order and use each page preset buttons.</p>
      <ol className="walkthrough-list">
        {demoWalkthroughSteps.map((step, index) => (
          <li key={step.id} className="walkthrough-item">
            <span className="walkthrough-index">{index + 1}</span>
            <div>
              <Link href={step.href} className="walkthrough-link">
                {step.title}
              </Link>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
