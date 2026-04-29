import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PASSWORD = process.env.APP_PASSWORD || 'changeme'

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (body.password === PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('auth', 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return res
  }
  return NextResponse.json({ error: 'wrong password' }, { status: 401 })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth', '', { maxAge: 0, path: '/' })
  return res
}
