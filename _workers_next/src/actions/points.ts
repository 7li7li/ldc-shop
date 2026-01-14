'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dailyCheckins, loginUsers } from "@/lib/db/schema"
import { getSetting } from "@/lib/db/queries"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function checkIn() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Not logged in" }
    }

    // 0. Check if feature is enabled
    const enabledStr = await getSetting('checkin_enabled')
    if (enabledStr === 'false') {
        return { success: false, error: "Check-in is currently disabled" }
    }

    const userId = session.user.id

    try {
        // Drizzle's {mode: 'timestamp'} stores timestamps as SECONDS in D1, not milliseconds!
        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

        // Convert to seconds for D1 comparison
        const startSec = Math.floor(startOfDayUTC.getTime() / 1000);
        const endSec = Math.floor(endOfDayUTC.getTime() / 1000);

        const existingResult: any = await db.run(sql`
            SELECT id FROM daily_checkins_v2 
            WHERE user_id = ${userId} 
            AND created_at >= ${startSec}
            AND created_at < ${endSec}
            LIMIT 1
        `)
        // D1 returns { results: [...], success: true, meta: {...} }
        const existing = existingResult?.results || existingResult?.rows || []
        console.log('[CheckIn] userId:', userId, 'range:', startSec, '-', endSec, 'existing:', existing.length)

        if (existing.length > 0) {
            return { success: false, error: "Already checked in today" }
        }

        // 2. Get Reward Amount
        const rewardStr = await getSetting('checkin_reward')
        const reward = parseInt(rewardStr || '10', 10)

        // 3. Perform Check-in & Award Points (sequential, no transaction)
        await db.insert(dailyCheckins).values({ userId })
        await db.update(loginUsers)
            .set({ points: sql`${loginUsers.points} + ${reward}` })
            .where(eq(loginUsers.userId, userId))

        revalidatePath('/')
        return { success: true, points: reward }
    } catch (error: any) {
        if (isMissingTable(error)) {
            await ensureDailyCheckinsTable()
            return checkIn()
        }
        console.error("Check-in error:", error)
        // Return actual error for debugging
        return { success: false, error: `Check-in failed: ${error?.message || 'Unknown error'}` }
    }
}

async function ensureDailyCheckinsTable() {
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS daily_checkins_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            created_at INTEGER DEFAULT (unixepoch() * 1000)
        )
    `);
    try {
        await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS daily_checkins_v2_user_date_unique ON daily_checkins_v2(user_id, date(created_at / 1000, 'unixepoch'))`);
    } catch { /* Index may already exist */ }
    try {
        await db.run(sql.raw(`ALTER TABLE login_users ADD COLUMN points INTEGER DEFAULT 0 NOT NULL`));
    } catch { /* Column may already exist */ }
}

function isMissingTable(error: any) {
    const check = (e: any) => e?.message?.includes('does not exist') || e?.code === '42P01' || e?.message?.includes('no such table')
    return check(error) || (error?.cause && check(error.cause))
}

export async function getUserPoints() {
    const session = await auth()
    if (!session?.user?.id) return 0

    const user = await db.query.loginUsers.findFirst({
        where: eq(loginUsers.userId, session.user.id),
        columns: { points: true }
    })

    return user?.points || 0
}

export async function getCheckinStatus() {
    const session = await auth()
    if (!session?.user?.id) return { checkedIn: false }

    const enabledStr = await getSetting('checkin_enabled')
    if (enabledStr === 'false') {
        return { checkedIn: false, disabled: true }
    }

    try {
        // Drizzle's {mode: 'timestamp'} stores timestamps as SECONDS in D1, not milliseconds!
        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

        // Convert to seconds for D1 comparison
        const startSec = Math.floor(startOfDayUTC.getTime() / 1000);
        const endSec = Math.floor(endOfDayUTC.getTime() / 1000);

        const result: any = await db.run(sql`
            SELECT id FROM daily_checkins_v2 
            WHERE user_id = ${session.user.id} 
            AND created_at >= ${startSec}
            AND created_at < ${endSec}
            LIMIT 1
        `)

        // D1 returns { results: [...], success: true, meta: {...} }
        const rows = result?.results || result?.rows || []
        console.log('[CheckinStatus] userId:', session.user.id, 'range:', startSec, '-', endSec, 'rows:', rows.length)

        return { checkedIn: rows.length > 0 }
    } catch (error: any) {
        console.error('[CheckinStatus] Error:', error?.message, error)
        if (isMissingTable(error)) {
            await ensureDailyCheckinsTable()
            return { checkedIn: false }
        }
        return { checkedIn: false }
    }
}
