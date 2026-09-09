'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { checkIn, getCheckinRewardConfig, getUserPoints, getCheckinStatus, type CheckinMode } from "@/actions/points"
import { toast } from "sonner"
import { Gift, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

type RewardConfig = { min: number; max: number; fixed: number }

export function CheckInButton({
    enabled = true,
    showPoints = true,
    showCheckedInLabel = false,
    className,
    onPointsChange,
    onCheckedInChange,
}: {
    enabled?: boolean
    showPoints?: boolean
    showCheckedInLabel?: boolean
    className?: string
    onPointsChange?: (points: number) => void
    onCheckedInChange?: (checkedIn: boolean) => void
}) {
    const { t } = useI18n()
    const [points, setPoints] = useState(0)
    const [checkedIn, setCheckedIn] = useState(false)
    const [loading, setLoading] = useState(true)
    const [checkingIn, setCheckingIn] = useState(false)
    const [modeDialogOpen, setModeDialogOpen] = useState(false)
    const [rewardConfig, setRewardConfig] = useState<RewardConfig | null>(null)

    useEffect(() => {
        const init = async () => {
            try {
                const [p, s, cfg] = await Promise.all([
                    getUserPoints(),
                    getCheckinStatus(),
                    getCheckinRewardConfig(),
                ])
                setPoints(p)
                setCheckedIn(s.checkedIn)
                setRewardConfig(cfg)
                onPointsChange?.(p)
                onCheckedInChange?.(s.checkedIn)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    const handleCheckIn = async (mode: CheckinMode) => {
        setCheckingIn(true)
        try {
            const res = await checkIn(mode)
            if (res.success) {
                setModeDialogOpen(false)
                toast.success(t('checkin.success', { points: res.points || 0 }))
                setPoints(prev => {
                    const next = prev + (res.points || 0)
                    onPointsChange?.(next)
                    return next
                })
                setCheckedIn(true)
                onCheckedInChange?.(true)
            } else {
                if (res.error === "Already checked in today") {
                    setModeDialogOpen(false)
                    setCheckedIn(true)
                    onCheckedInChange?.(true)
                    toast.info(t('checkin.alreadyCheckedIn'))
                } else {
                    toast.error(res.error ? t(`checkin.${res.error}`) : t('checkin.failed'))
                }
            }
        } catch (e) {
            toast.error(t('checkin.networkError'))
        } finally {
            setCheckingIn(false)
        }
    }

    if (loading) return null

    const rangeMin = rewardConfig?.min ?? 10
    const rangeMax = rewardConfig?.max ?? rangeMin
    const fixedReward = rewardConfig?.fixed ?? rangeMin

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {showPoints && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm font-medium">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span>{points}</span>
                </div>
            )}

            {enabled && !checkedIn && (
                <Dialog open={modeDialogOpen} onOpenChange={(v) => !checkingIn && setModeDialogOpen(v)}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-500/20 text-amber-600 dark:text-amber-400"
                            disabled={checkingIn}
                        >
                            <Gift className={cn("w-4 h-4", checkingIn && "animate-pulse")} />
                            {t('checkin.button')}
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader>
                            <DialogTitle>{t('checkin.chooseModeTitle')}</DialogTitle>
                            <DialogDescription>{t('checkin.chooseModeDescription')}</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-2">
                            <Button
                                variant="outline"
                                className="h-auto justify-start gap-3 py-3"
                                onClick={() => handleCheckIn('random')}
                                disabled={checkingIn}
                            >
                                <Gift className="h-4 w-4" />
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{t('checkin.modeRandom')}</span>
                                    <span className="text-xs text-muted-foreground">{t('checkin.modeRandomHint', { min: rangeMin, max: rangeMax })}</span>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto justify-start gap-3 py-3"
                                onClick={() => handleCheckIn('fixed')}
                                disabled={checkingIn}
                            >
                                <Coins className="h-4 w-4" />
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{t('checkin.modeFixed', { points: fixedReward })}</span>
                                    <span className="text-xs text-muted-foreground">{t('checkin.modeFixedHint', { points: fixedReward })}</span>
                                </div>
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setModeDialogOpen(false)} disabled={checkingIn}>
                                {t('common.cancel')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {enabled && checkedIn && showCheckedInLabel && (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-muted-foreground"
                    disabled
                >
                    {t('checkin.checkedIn')}
                </Button>
            )}
        </div>
    )
}
