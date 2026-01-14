import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AdminPaymentCodeContent } from "@/components/admin/payment-code-content"
import { md5 } from "@/lib/crypto"

async function resolveBaseUrl() {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

    const headerList = await headers()
    const forwardedProto = headerList.get('x-forwarded-proto')
    const forwardedHost = headerList.get('x-forwarded-host')
    const host = forwardedHost || headerList.get('host')
    const proto = forwardedProto || 'http'
    if (host) return `${proto}://${host}`
    return 'http://localhost:3000'
}

export default async function AdminCollectPage() {
    const baseUrl = await resolveBaseUrl()
    const session = await auth()
    const adminUsers = (process.env.ADMIN_USERS || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    const adminFromEnv = adminUsers[0] || null
    const payeeCandidate = session?.user?.username || session?.user?.name || adminFromEnv || null
    const payeeMatch = payeeCandidate
        ? adminUsers.find((name) => name.toLowerCase() === payeeCandidate.toLowerCase())
        : undefined
    const payee = payeeMatch || payeeCandidate
    const secret = process.env.MERCHANT_KEY || ''
    const sig = payee && secret ? md5(`payee=${payee}${secret}`) : null
    const payLink = payee && sig
        ? `${baseUrl}/pay?to=${encodeURIComponent(payee)}&sig=${sig}`
        : `${baseUrl}/pay`

    return <AdminPaymentCodeContent payLink={payLink} payee={payee} />
}
