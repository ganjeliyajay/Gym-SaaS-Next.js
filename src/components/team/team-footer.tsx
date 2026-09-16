export default function TeamFooter({ showing, total }: { showing?: number; total?: number } = {}) {
  return (
    <div className="mt-5 flex flex-col gap-2 border-t border-gray-200 pt-5 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
      <p>{showing != null && total != null ? `Showing ${showing} of ${total} team members` : "Manage your team members and their access permissions."}</p>

      <p>Team management</p>
    </div>
  )
}
