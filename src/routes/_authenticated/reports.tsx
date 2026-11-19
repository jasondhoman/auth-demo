import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/reports')({
  component: function Reports() {
    return (
      <main className="auth">
        <h1>Reports</h1>
        <p>Sample reports for testing authenticated routes.</p>
        <ul>
          <li>Monthly activity</li>
          <li>Project summary</li>
        </ul>
      </main>
    )
  },
})
