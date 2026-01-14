'use client'

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnnouncementConfig, saveAnnouncement } from "@/actions/settings"

interface AnnouncementFormProps {
    initialConfig: AnnouncementConfig | null
}

function toDatetimeLocal(value: string | null | undefined): string {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function AnnouncementForm({ initialConfig }: AnnouncementFormProps) {
    const { t } = useI18n()
    const [content, setContent] = useState(initialConfig?.content || '')
    const [startAt, setStartAt] = useState(toDatetimeLocal(initialConfig?.startAt))
    const [endAt, setEndAt] = useState(toDatetimeLocal(initialConfig?.endAt))
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        setSaved(false)
        try {
            await saveAnnouncement({
                content,
                startAt: startAt ? new Date(startAt).toISOString() : null,
                endAt: endAt ? new Date(endAt).toISOString() : null,
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card className="tech-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    {t('announcement.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="announcement-start">{t('announcement.startAt')}</Label>
                        <Input
                            id="announcement-start"
                            type="datetime-local"
                            value={startAt}
                            onChange={(e) => setStartAt(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="announcement-end">{t('announcement.endAt')}</Label>
                        <Input
                            id="announcement-end"
                            type="datetime-local"
                            value={endAt}
                            onChange={(e) => setEndAt(e.target.value)}
                        />
                    </div>
                </div>
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('announcement.placeholder')}
                    rows={4}
                    className="resize-none"
                />
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-primary to-primary/80"
                    >
                        {saving ? t('common.processing') : t('announcement.save')}
                    </Button>
                    {saved && (
                        <span className="text-sm text-green-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('announcement.saved')}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {t('announcement.hint')}
                </p>
            </CardContent>
        </Card>
    )
}
