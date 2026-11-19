import { createFileRoute, Link } from '@tanstack/react-router'
import { todos } from '../../../todos'

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: function Dashboard() {
    return (
      <main className="auth">
        <h1>Dashboard</h1>
        <p>Sample data for testing authenticated routes.</p>
        <p>Open tasks: {todos.length}</p>
        <p>Projects: 2</p>
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <Link to="/dashboard/todos/$todoId" params={{ todoId: todo.id }}>{todo.title}</Link>
            </li>
          ))}
        </ul>
      </main>
    )
  },
})
