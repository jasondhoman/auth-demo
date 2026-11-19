import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { todos } from '../../../../todos'

export const Route = createFileRoute('/_authenticated/dashboard/todos/$todoId')({
  loader: ({ params }) => {
    const todo = todos.find((item) => item.id === params.todoId)
    if (!todo) throw notFound()
    return todo
  },
  notFoundComponent: function TodoNotFound() {
    return (
      <main className="auth">
        <h1>Todo not found</h1>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    )
  },
  component: function Todo() {
    const todo = Route.useLoaderData()
    return (
      <main className="auth">
        <h1>{todo.title}</h1>
        <p>{todo.description}</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    )
  },
})
