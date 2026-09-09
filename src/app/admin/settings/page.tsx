import { getDashboardStats, getSetting, getAllSettings, getVisitorCount } from "@/lib/db/queries"
import { isRegistryEnabled } from "@/lib/registry"
import { AdminSettingsContent } from "@/components/admin/settings-content"
import { unstable_noStore } from "next/cache"
import { cookies } from "next/headers"
import { resolveEffectiveShopLogo } from "@/lib/shop-logo"
import { DEFAULT_THEME_FONT, isThemeFont } from "@/lib/theme-fonts"

export default async function AdminSettingsPage() {
    const cookieStore = await cookies()
    void cookieStore.get('ldc_pending_order')
    unstable_noStore()
    const nowMs = Date.now()
    const [stats, settingsMap, visitorCount] = await Promise.all([
        getDashboardStats(nowMs),
        getAllSettings(),
        getVisitorCount().catch(() => 0)
    ])

    const shopName = settingsMap['shop_name'] || null
    const shopDescription = settingsMap['shop_description'] || null
    const homeTitle = settingsMap['home_title'] || null
    const homeSubtitle = settingsMap['home_subtitle'] || null
    const customerServiceUrl = settingsMap['customer_service_url'] || null
    const customerServiceSvg = settingsMap['customer_service_svg'] || null
    const shopLogo = resolveEffectiveShopLogo(settingsMap['shop_logo'] || '', settingsMap['shop_logo_source'] || '').effectiveLogo || null
    const shopFooter = settingsMap['shop_footer'] || null
    const currencyUnit = settingsMap['currency_unit'] || null
    const themeColor = settingsMap['theme_color'] || null
    const themeFont = isThemeFont(settingsMap['theme_font'] || '') ? settingsMap['theme_font'] : DEFAULT_THEME_FONT

    const lowStockThreshold = Number.parseInt(settingsMap['low_stock_threshold'] || '5', 10) || 5
    const legacyCheckinReward = Number.parseInt(settingsMap['checkin_reward'] || '10', 10) || 10
    const checkinRewardMin = Number.parseInt(settingsMap['checkin_reward_min'] || String(legacyCheckinReward), 10) || legacyCheckinReward
    const checkinRewardMaxRaw = Number.parseInt(settingsMap['checkin_reward_max'] || String(checkinRewardMin), 10) || checkinRewardMin
    const checkinRewardMax = Math.max(checkinRewardMin, checkinRewardMaxRaw)
    const checkinFixedRewardRaw = Number.parseInt(settingsMap['checkin_reward_fixed'] || String(checkinRewardMin), 10) || checkinRewardMin
    const checkinFixedReward = Math.max(1, checkinFixedRewardRaw)
    const checkinEnabled = settingsMap['checkin_enabled'] !== 'false'
    const pointsPurchaseEnabled = settingsMap['points_purchase_enabled'] === 'true'
    const pointsPurchaseRate = Number.parseFloat(settingsMap['points_purchase_rate'] || '1') || 1
    const wishlistEnabled = settingsMap['wishlist_enabled'] === 'true'
    const noIndexEnabled = settingsMap['noindex_enabled'] === 'true'
    const registryOptIn = settingsMap['registry_opt_in'] === 'true'
    const refundReclaimCards = settingsMap['refund_reclaim_cards'] !== 'false'
    const registryHideNav = settingsMap['registry_hide_nav'] === 'true'

    return (
        <AdminSettingsContent
            stats={stats}
            shopName={shopName}
            shopDescription={shopDescription}
            homeTitle={homeTitle}
            homeSubtitle={homeSubtitle}
            customerServiceUrl={customerServiceUrl}
            customerServiceSvg={customerServiceSvg}
            shopLogo={shopLogo}
            shopFooter={shopFooter}
            currencyUnit={currencyUnit}
            themeColor={themeColor}
            themeFont={themeFont}
            visitorCount={visitorCount}
            lowStockThreshold={lowStockThreshold}
            checkinRewardMin={checkinRewardMin}
            checkinRewardMax={checkinRewardMax}
            checkinFixedReward={checkinFixedReward}
            checkinEnabled={checkinEnabled}
            pointsPurchaseEnabled={pointsPurchaseEnabled}
            pointsPurchaseRate={pointsPurchaseRate}
            wishlistEnabled={wishlistEnabled}
            noIndexEnabled={noIndexEnabled}
            registryOptIn={registryOptIn}
            refundReclaimCards={refundReclaimCards}
            registryHideNav={registryHideNav}
            registryEnabled={isRegistryEnabled()}
        />
    )
}
