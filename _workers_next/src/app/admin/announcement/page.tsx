import { AnnouncementForm } from "@/components/admin/announcement-form"
import { getAnnouncementConfig } from "@/actions/settings"

export default async function AnnouncementPage() {
    const announcement = await getAnnouncementConfig()

    return (
        <div className="space-y-6">
            <AnnouncementForm initialConfig={announcement} />
        </div>
    )
}
