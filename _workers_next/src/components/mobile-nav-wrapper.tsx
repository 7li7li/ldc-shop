import { auth } from "@/lib/auth"
import { getSetting } from "@/lib/db/queries"
import { isRegistryEnabled } from "@/lib/registry"
import { MobileNav } from "./mobile-nav"

export async function MobileNavWrapper() {
    const session = await auth()
    const user = session?.user

    // Check if admin (case-insensitive)
    const rawAdminUsers = process.env.ADMIN_USERS?.split(',') || []
    const adminUsers = rawAdminUsers.map(u => u.toLowerCase())
    const isAdmin = user?.username && adminUsers.includes(user.username.toLowerCase()) || false

    const registryEnabled = isRegistryEnabled()
    let registryOptIn = false
    let registryHideNav = false
    if (registryEnabled) {
        try {
            const [optIn, hideNav] = await Promise.all([
                getSetting('registry_opt_in'),
                getSetting('registry_hide_nav')
            ])
            registryOptIn = optIn === 'true'
            registryHideNav = hideNav === 'true'
        } catch {
            registryOptIn = false
            registryHideNav = false
        }
    }
    // LDC navigator entry is intentionally hidden.
    // const showNav = registryEnabled && (registryOptIn || !registryHideNav)
    const showNav = false

    return <MobileNav isLoggedIn={!!user} isAdmin={isAdmin} showNav={showNav} />
}
