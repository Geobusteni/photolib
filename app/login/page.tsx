import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { setupRequired } from '@/lib/users'
import LoginForm from './_components/LoginForm'

export const metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await setupRequired()) redirect('/setup')

  const session = await getSession()
  if (session.userId) redirect('/projects')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Photolib
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}
