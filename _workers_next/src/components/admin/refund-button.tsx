'use client'

import { Button } from "@/components/ui/button"
import { getRefundParams, markOrderRefunded, proxyRefund } from "@/actions/refund"
import { verifyOrderRefundStatus } from "@/actions/admin-orders"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, ExternalLink, CheckCircle, RefreshCcw } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export function RefundButton({ order }: { order: any }) {
    const [loading, setLoading] = useState(false)
    const [showMarkDone, setShowMarkDone] = useState(false)
    const { t } = useI18n()

    if (order.status !== 'delivered' && order.status !== 'paid') return null
    if (!order.tradeNo) return null
    if (Number(order.amount) <= 0) return null // No refund for orders paid entirely with points

    const handleClientRefund = async () => {
        // if (!confirm(t('admin.orders.refundConfirm'))) return // No double confirm for fallback

        setLoading(true)
        try {
            const params = await getRefundParams(order.orderId)

            // Create and submit form in new tab
            const form = document.createElement('form')
            form.method = 'POST'
            form.action = 'https://credit.linux.do/epay/api.php'
            form.target = '_blank'

            Object.entries(params).forEach(([k, v]) => {
                const input = document.createElement('input')
                input.type = 'hidden'
                input.name = k
                input.value = String(v)
                form.appendChild(input)
            })

            document.body.appendChild(form)
            form.submit()
            document.body.removeChild(form)

            setShowMarkDone(true)
            toast.info(t('admin.orders.refundInfo'))

            // Auto-verify: Check every 2 seconds, up to 10 times (20s)
            let attempts = 0
            const maxAttempts = 10
            const interval = setInterval(async () => {
                attempts++
                try {
                    // Don't set main loading state to avoid blocking UI during polling
                    const result = await verifyOrderRefundStatus(order.orderId)
                    if (result.success && result.status === 0) { // Refunded
                        clearInterval(interval)
                        toast.success(t('admin.orders.verifySuccessRefunded'))
                        // Revalidation happens in server action, so UI should update on refresh or if we trigger it.
                        // Since server action revalidates path, next router refresh might be needed or handled by revalidatePath?
                        // revalidatePath updates server cache, client router needs to refresh to see new data if not pushed.
                        // But verifying logic updates DB, so if we refresh router it should show 'refunded'
                        // verifyOrderRefundStatus calls revalidatePath.
                        // Let's just stop polling.
                    }
                    if (attempts >= maxAttempts) {
                        clearInterval(interval)
                    }
                } catch (e) {
                    console.error("Auto verify failed", e)
                }
            }, 2000)

        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRefund = async () => {
        if (!confirm(t('admin.orders.refundProxyConfirm'))) return
        setLoading(true)
        try {
            const result = await proxyRefund(order.orderId)
            if (result.processed) {
                toast.success(t('admin.orders.verifySuccessRefunded'))
            } else {
                toast.error(t('admin.orders.refundProxyNotProcessed'), {
                    action: {
                        label: t('admin.orders.tryManual'),
                        onClick: () => handleClientRefund()
                    },
                    duration: 8000
                })
                // Also show mark done if it was partial failure? 
                // Currently proxyRefund returns processed: false if API said fail.
                setShowMarkDone(true)
            }
        } catch (e: any) {
            toast.error(e.message || "Refund failed", {
                action: {
                    label: t('admin.orders.tryManual'),
                    onClick: () => handleClientRefund()
                },
                duration: 8000
            })
        } finally {
            setLoading(false)
        }
    }

    const handleMarkDone = async () => {
        if (!confirm(t('admin.orders.refundVerifyPlatform'))) return

        setLoading(true)
        try {
            await markOrderRefunded(order.orderId)
            toast.success(t('admin.orders.refundSuccess'))
            setShowMarkDone(false)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        setLoading(true)
        try {
            const result = await verifyOrderRefundStatus(order.orderId)
            if (result.success) {
                if (result.status === 0) { // Refunded
                    toast.success(t('admin.orders.verifySuccessRefunded'))
                } else if (result.status === 1) { // Paid
                    toast.info(t('admin.orders.verifyInfoPaid'))
                    setShowMarkDone(true)
                } else {
                    toast.info(`${t('admin.orders.verifyStatus')}: ${result.msg}`)
                }
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleVerify} disabled={loading} title={t('admin.orders.checkStatus')}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCcw className="h-3 w-3" /></>}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefund} disabled={loading || showMarkDone}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ExternalLink className="h-3 w-3 mr-1" />{t('admin.orders.refund')}</>}
            </Button>
            {showMarkDone && (
                <Button variant="default" size="sm" onClick={handleMarkDone} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />{t('admin.orders.markRefunded')}</>}
                </Button>
            )}
        </div>
    )
}
