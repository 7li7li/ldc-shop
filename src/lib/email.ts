import { db } from "./db"
import { settings } from "./db/schema"
import { inArray } from "drizzle-orm"

async function getSettingsUncached(keys: string[]): Promise<Record<string, string>> {
    try {
        const rows = await db.select({ key: settings.key, value: settings.value })
            .from(settings)
            .where(inArray(settings.key, keys))

        const map: Record<string, string> = {}
        for (const row of rows) {
            map[row.key] = row.value || ""
        }
        return map
    } catch (error: any) {
        const text = `${error?.message || ""}${JSON.stringify(error || {})}`.toLowerCase()
        if (text.includes("no such table") && text.includes("settings")) {
            return {}
        }
        throw error
    }
}

export async function getEmailSettings() {
    const values = await getSettingsUncached([
        'resend_api_key',
        'resend_from_email',
        'resend_from_name',
        'resend_enabled',
        'email_language',
        'telegram_language',
    ])

    const apiKey = (values.resend_api_key || '').trim()
    const fromEmail = (values.resend_from_email || '').trim()
    const fromName = (values.resend_from_name || '').trim()
    const enabled = values.resend_enabled === 'true'
    const emailLanguage = (values.email_language || '').trim()
    const telegramLanguage = (values.telegram_language || '').trim()

    return {
        apiKey,
        fromEmail,
        fromName: fromName || 'LDC Shop',
        enabled,
        language: emailLanguage || telegramLanguage || null
    }
}

interface OrderEmailParams {
    to: string
    orderId: string
    productName: string
    cardKeys: string
    language?: 'zh' | 'en'
}

const emailTemplates = {
    zh: {
        subject: (orderId: string) => `您的订单 ${orderId} 已完成`,
        body: (params: OrderEmailParams) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>订单确认</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎉 订单已完成</h1>
    </div>
    
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin-top: 0;">您好！</p>
        <p>感谢您的购买，以下是您的订单信息：</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>商品：</strong>${params.productName}</p>
            <p style="margin: 0 0 10px 0;"><strong>订单号：</strong><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${params.orderId}</code></p>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fcd34d; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">📦 您的卡密：</p>
            <pre style="background: white; padding: 15px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: 'Courier New', monospace; font-size: 14px;">${params.cardKeys}</pre>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">请妥善保管您的卡密信息。如有任何问题，请联系客服。</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">此邮件由系统自动发送，请勿直接回复。</p>
    </div>
</body>
</html>
        `.trim()
    },
    en: {
        subject: (orderId: string) => `Your Order ${orderId} is Complete`,
        body: (params: OrderEmailParams) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Order Complete</h1>
    </div>
    
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin-top: 0;">Hello!</p>
        <p>Thank you for your purchase. Here is your order information:</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Product:</strong> ${params.productName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${params.orderId}</code></p>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fcd34d; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">📦 Your Card Key(s):</p>
            <pre style="background: white; padding: 15px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: 'Courier New', monospace; font-size: 14px;">${params.cardKeys}</pre>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">Please keep your card key(s) safe. If you have any questions, please contact support.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">This is an automated email. Please do not reply directly.</p>
    </div>
</body>
</html>
        `.trim()
    }
}

export async function sendOrderEmail(params: OrderEmailParams) {
    try {
        const settings = await getEmailSettings()

        if (!settings.enabled) {
            console.log('[Email] Skipped: Email sending is disabled')
            return { success: false, error: 'Email sending is disabled' }
        }

        if (!settings.apiKey || !settings.fromEmail) {
            console.log('[Email] Skipped: Missing API key or from email')
            return { success: false, error: 'Missing configuration' }
        }

        if (!params.to) {
            console.log('[Email] Skipped: No recipient email')
            return { success: false, error: 'No recipient email' }
        }

        const lang = params.language || settings.language || 'zh'
        const template = emailTemplates[lang as keyof typeof emailTemplates] || emailTemplates.zh

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                from: `${settings.fromName} <${settings.fromEmail}>`,
                to: params.to,
                subject: template.subject(params.orderId),
                html: template.body(params)
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('[Email] Resend API Error:', error)
            return { success: false, error }
        }

        const result = await response.json()
        console.log('[Email] Sent successfully:', result.id)
        return { success: true, id: result.id }
    } catch (e: any) {
        console.error('[Email] Send Error:', e)
        return { success: false, error: e.message }
    }
}

export async function testResendEmail(to: string) {
    const settings = await getEmailSettings()

    if (!settings.apiKey || !settings.fromEmail) {
        return { success: false, error: 'Missing API key or from email' }
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                from: `${settings.fromName} <${settings.fromEmail}>`,
                to: to,
                subject: '🔔 LDC Shop Email Test',
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>✅ Email Configuration Successful!</h2>
                        <p>If you're reading this, your email settings are working correctly.</p>
                        <p style="color: #666; font-size: 14px;">This is a test email from LDC Shop.</p>
                    </div>
                `
            })
        })

        if (!response.ok) {
            const error = await response.text()
            return { success: false, error }
        }

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
