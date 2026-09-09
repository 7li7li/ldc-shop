'use client'

import { useMemo, useState } from "react"
import { Coins, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createPointsTopupOrder } from "@/actions/points-purchase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n/context"

export function PointsPurchaseButton({ rate }: { rate: number }) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const effectiveRate = Number.isFinite(rate) && rate > 0 ? rate : 1

    const previewPoints = useMemo(() => {
        const value = Number.parseFloat(amount)
        if (!Number.isFinite(value) || value <= 0) return 0
        return Math.floor(value * effectiveRate)
    }, [amount, effectiveRate])

    const handleSubmit = async () => {
        const numeric = Number.parseFloat(amount)
        if (!Number.isFinite(numeric) || numeric <= 0) {
            toast.error(t('payment.invalidAmount'))
            return
        }
        if (previewPoints <= 0) {
            toast.error(t('pointsPurchase.invalidPoints'))
            return
        }

        setSubmitting(true)
        try {
            const result = await createPointsTopupOrder(numeric)
            if (!result?.success || !result.params) {
                toast.error(result?.error ? t(result.error) : t('common.error'))
                return
            }

            const form = document.createElement('form')
            form.method = 'POST'
            form.action = '/paying'
            Object.entries(result.params).forEach(([key, value]) => {
                const input = document.createElement('input')
                input.type = 'hidden'
                input.name = key
                input.value = String(value)
                form.appendChild(input)
            })
            document.body.appendChild(form)
            form.submit()
        } catch (error: any) {
            toast.error(error?.message || t('common.error'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <Button type="button" variant="outline" className="h-10 rounded-2xl border-border/50 bg-background/70 px-4 shadow-none" onClick={() => setOpen(true)}>
                <Coins className="mr-2 h-4 w-4" />
                {t('pointsPurchase.buyButton')}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{t('pointsPurchase.title')}</DialogTitle>
                        <DialogDescription>{t('pointsPurchase.description', { rate: effectiveRate })}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="points-topup-amount">{t('payment.amountLabel')}</Label>
                            <Input
                                id="points-topup-amount"
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder={t('payment.amountPlaceholder')}
                                disabled={submitting}
                            />
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                            {t('pointsPurchase.preview', { points: previewPoints })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t('common.cancel')}</Button>
                        <Button onClick={handleSubmit} disabled={submitting || previewPoints <= 0}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t('payment.payButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
