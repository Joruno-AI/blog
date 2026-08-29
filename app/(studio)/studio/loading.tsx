import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-7 animate-spin" />
      <span className="text-sm">加载中...</span>
    </div>
  )
}
