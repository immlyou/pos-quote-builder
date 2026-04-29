'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocaleStore } from '@/store/locale'
import { Button, Input } from '@/components/ui'
import { Suspense } from 'react'

function LoginForm() {
  const { t } = useLocaleStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      const from = searchParams.get('from') || '/'
      router.push(from)
    } else {
      setError(t.wrongPassword)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-brand-700 mb-1">{t.appTitle}</div>
          <div className="text-gray-500 text-sm">{t.loginTitle}</div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.password}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '...' : t.loginBtn}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
