'use client'

import {
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Github,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react'
import { AlertDialog, Button, Card, Chip, Spinner } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface Stats {
  resources: number
  published: number
  categories: number
  tags: number
  assets: number
  jobs: number
}

interface Config {
  dbConnected: boolean
  hasR2Config: boolean
  hasSchedulerConfig: boolean
  hasGitHubConfig: boolean
  githubRepository: string | null
  githubBranch: string
  stats: Stats
}

interface ImportPlan {
  resources: { total: number; create: number; update: number }
  revisions: number
  categories: number
  tags: number
  assets: number
  routes: number
  relations: number
  conflicts: string[]
}

interface ImportJobResponse {
  jobId: string
  status: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'
  progress: number
  plan: ImportPlan | null
  error: string | null
  done: boolean
  retryAt?: string
}

const IMPORT_JOB_STORAGE_KEY = 'joruno:active-content-import-job'
const EXPORT_JOB_STORAGE_KEY = 'joruno:active-content-export-job'

interface ExportJobResponse {
  jobId: string
  mode: 'download' | 'github'
  status: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error: string | null
  done: boolean
  retryAt?: string
  downloadUrl?: string
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

async function jsonRequest(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as Record<string, unknown>
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`)
  return payload
}

async function bundleImportRequest(file: File, dryRun: boolean) {
  const response = await fetch(`/api/content-transfer/import?dryRun=${dryRun ? 'true' : 'false'}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(!dryRun ? { 'X-Content-Import-Confirm': 'APPLY_CONTENT_IMPORT' } : {}),
    },
    body: file,
  })
  const payload = await response.json() as Record<string, unknown>
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`)
  return payload
}

function StatusBadge({ active, yes, no }: { active: boolean; yes: string; no: string }) {
  return active
    ? <Chip color="success" size="sm" variant="soft"><CheckCircle2 className="size-3" />{yes}</Chip>
    : <Chip color="danger" size="sm" variant="soft"><XCircle className="size-3" />{no}</Chip>
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [bundle, setBundle] = useState<File | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [confirmation, setConfirmation] = useState<'apply-file' | 'push' | 'import' | null>(null)
  const [importProgress, setImportProgress] = useState<number | null>(null)
  const [exportProgress, setExportProgress] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const resumeStarted = useRef(false)

  async function finishImportJob(initial: unknown) {
    let job = initial as unknown as ImportJobResponse
    if (!job.jobId) throw new Error('导入作业未返回持久化 ID')
    window.localStorage.setItem(IMPORT_JOB_STORAGE_KEY, job.jobId)
    setImportProgress(job.progress ?? 0)
    while (!job.done) {
      const retryDelay = job.retryAt ? Math.max(0, new Date(job.retryAt).valueOf() - Date.now()) : 0
      await wait(Math.max(100, retryDelay))
      job = await jsonRequest(`/api/content-transfer/jobs/${encodeURIComponent(job.jobId)}`, {}) as unknown as ImportJobResponse
      setImportProgress(job.progress ?? 0)
    }
    window.localStorage.removeItem(IMPORT_JOB_STORAGE_KEY)
    if (job.status !== 'completed') throw new Error(job.error || '导入作业失败')
    return job
  }

  async function finishExportJob(initial: unknown) {
    let job = initial as ExportJobResponse
    if (!job.jobId) throw new Error('导出作业未返回持久化 ID')
    window.localStorage.setItem(EXPORT_JOB_STORAGE_KEY, job.jobId)
    setExportProgress(job.progress ?? 0)
    while (!job.done) {
      const retryDelay = job.retryAt ? Math.max(0, new Date(job.retryAt).valueOf() - Date.now()) : 0
      await wait(Math.max(150, retryDelay))
      job = await jsonRequest(`/api/content-transfer/export/jobs/${encodeURIComponent(job.jobId)}`, {}) as unknown as ExportJobResponse
      setExportProgress(job.progress ?? 0)
    }
    window.localStorage.removeItem(EXPORT_JOB_STORAGE_KEY)
    if (job.status !== 'completed') throw new Error(job.error || '导出作业失败')
    return job
  }

  async function saveCompletedDownload(job: ExportJobResponse) {
    const response = await fetch(job.downloadUrl || `/api/content-transfer/export?jobId=${encodeURIComponent(job.jobId)}`)
    if (!response.ok) throw new Error('导出文件读取失败')
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'joruno-content.json'
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    void fetch('/api/settings/config')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('配置读取失败')))
      .then(setConfig)
      .catch((error) => toast.error(error instanceof Error ? error.message : '配置读取失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const storedId = window.localStorage.getItem(EXPORT_JOB_STORAGE_KEY)
    if (!storedId) return
    setAction('resume-export')
    void fetch(`/api/content-transfer/export/jobs/${encodeURIComponent(storedId)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('导出作业状态读取失败')))
      .then(async (active: ExportJobResponse) => {
        const completed = await finishExportJob(active)
        if (completed.mode === 'download') await saveCompletedDownload(completed)
        toast.success(completed.mode === 'download' ? '已恢复并下载完整内容包' : '已恢复并完成 GitHub 导出')
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : '导出作业恢复失败'))
      .finally(() => {
        setExportProgress(null)
        setAction(null)
      })
  }, [])

  useEffect(() => {
    if (resumeStarted.current) return
    resumeStarted.current = true
    void fetch('/api/content-transfer/jobs', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('导入作业状态读取失败')))
      .then(async (payload: { jobs?: ImportJobResponse[] }) => {
        const storedId = window.localStorage.getItem(IMPORT_JOB_STORAGE_KEY)
        const active = payload.jobs?.find((job) => job.jobId === storedId) ?? payload.jobs?.[0]
        if (!active) {
          window.localStorage.removeItem(IMPORT_JOB_STORAGE_KEY)
          return
        }
        setAction('resume-import')
        await finishImportJob(active)
        toast.success('已恢复并完成上次的持久化导入作业')
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : '导入作业恢复失败'))
      .finally(() => {
        setImportProgress(null)
        setAction(null)
      })
  }, [])

  async function downloadBundle() {
    setAction('download')
    try {
      const started = await jsonRequest('/api/content-transfer/export', {})
      const completed = await finishExportJob(started)
      await saveCompletedDownload(completed)
      toast.success('内容包已导出')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExportProgress(null)
      setAction(null)
    }
  }

  async function previewFile(file: File) {
    setAction('preview-file')
    try {
      const started = await bundleImportRequest(file, true)
      const result = await finishImportJob(started)
      if (!result.plan) throw new Error('内容包预检未返回计划')
      setBundle(file)
      setPlan(result.plan)
      toast.success('校验完成，尚未写入数据库')
    } catch (error) {
      setBundle(null)
      setPlan(null)
      toast.error(error instanceof Error ? error.message : '内容包校验失败')
    } finally {
      setAction(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function applyFile() {
    if (!bundle || !plan || plan.conflicts.length) return
    setAction('apply-file')
    try {
      const started = await bundleImportRequest(bundle, false)
      await finishImportJob(started)
      toast.success('内容包已安全合并到 D1')
      setBundle(null)
      setPlan(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败')
    } finally {
      setImportProgress(null)
      setAction(null)
    }
  }

  async function githubAction(kind: 'preview-export' | 'push' | 'preview-import' | 'import') {
    const isExport = kind === 'preview-export' || kind === 'push'
    const applying = kind === 'push' || kind === 'import'
    setAction(kind)
    try {
      const started = await jsonRequest(`/api/content-transfer/github/${isExport ? 'export' : 'import'}`, {
        dryRun: !applying,
        confirm: kind === 'push' ? 'PUSH_CONTENT_TO_GITHUB' : kind === 'import' ? 'APPLY_GITHUB_CONTENT' : undefined,
      })
      const result = isExport && applying
        ? await finishExportJob(started)
        : isExport
          ? started
          : await finishImportJob(started)
      if (!isExport && !applying) {
        const nextPlan = (result as ImportJobResponse).plan
        if (!nextPlan) throw new Error('GitHub 导入预检未返回计划')
        setPlan(nextPlan)
        if (nextPlan.conflicts.length) throw new Error(`预检发现 ${nextPlan.conflicts.length} 个冲突`)
      }
      toast.success(applying ? 'GitHub 同步完成' : 'GitHub 同步预检通过')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'GitHub 同步失败')
    } finally {
      setImportProgress(null)
      setExportProgress(null)
      setAction(null)
    }
  }

  if (loading) {
    return <div className="studio-empty-state min-h-[60vh]"><Spinner size="sm" />加载运行状态</div>
  }

  const stats = config?.stats ?? { resources: 0, published: 0, categories: 0, tags: 0, assets: 0, jobs: 0 }
  const services = [
    { title: 'Cloudflare D1', description: '内容、版本、分类与发布状态', active: config?.dbConnected ?? false, icon: Database },
    { title: 'Cloudflare R2', description: '图片、音频与附件对象存储', active: config?.hasR2Config ?? false, icon: HardDrive },
    { title: '定时发布', description: 'Cron Trigger 与安全作业执行器', active: config?.hasSchedulerConfig ?? false, icon: Clock3 },
    { title: 'GitHub 同步', description: config?.githubRepository ? `${config.githubRepository} · ${config.githubBranch}` : '内容仓库与分支尚未配置', active: config?.hasGitHubConfig ?? false, icon: Github },
  ]

  const confirmationCopy = confirmation === 'apply-file'
    ? `将更新 ${plan?.resources.update ?? 0} 个并创建 ${plan?.resources.create ?? 0} 个资源。`
    : confirmation === 'push'
      ? '将当前 D1 内容提交到 GitHub 内容分支。'
      : '将 GitHub 内容安全合并到当前 D1。'

  function confirmPendingAction() {
    const pending = confirmation
    setConfirmation(null)
    if (pending === 'apply-file') void applyFile()
    if (pending === 'push' || pending === 'import') void githubAction(pending)
  }

  return (
    <main className="studio-dashboard studio-settings-page">
      <section className="studio-page-heading"><div><p className="studio-eyebrow">System</p><h1>系统设置</h1><p>检查基础设施状态，并管理 D1、R2 与 GitHub 的可回滚内容链路。</p></div></section>

      <section className="studio-service-grid">
        {services.map(({ title, description, active, icon: Icon }) => (
          <Card key={title} className="studio-panel">
            <Card.Header className="relative p-4">
              <span className="studio-stat-icon mb-3"><Icon className="size-4" /></span>
              <Card.Title className="text-sm">{title}</Card.Title>
              <Card.Description className="mt-1 min-h-10 text-xs">{description}</Card.Description>
              <div className="studio-service-status"><StatusBadge active={active} yes="已配置" no="待配置" /></div>
            </Card.Header>
          </Card>
        ))}
      </section>

      <section className="studio-system-stats" aria-label="平台数据统计">
        {Object.entries({ 资源: stats.resources, 已发布: stats.published, 分类: stats.categories, 标签: stats.tags, 资产: stats.assets, 作业: stats.jobs }).map(([label, value]) => (
          <Card key={label} className="studio-panel"><Card.Content className="p-4"><p className="text-muted text-xs">{label}</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p></Card.Content></Card>
        ))}
      </section>

      <section className="studio-settings-grid">
        <Card className="studio-panel">
          <Card.Header className="studio-panel-heading">
            <Card.Title className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4" />内容包迁移</Card.Title>
            <Card.Description>完整导出资源、全部版本、关系、设置和 R2 资产指针；导入默认只预检。</Card.Description>
          </Card.Header>
          <Card.Content className="studio-form-content space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onPress={() => void downloadBundle()} isDisabled={Boolean(action)}><Download className="size-4" />{action === 'download' ? '导出中' : '下载完整内容包'}</Button>
              <Button variant="outline" onPress={() => fileInput.current?.click()} isDisabled={Boolean(action)}><Upload className="size-4" />选择内容包并预检</Button>
              <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => event.target.files?.[0] && void previewFile(event.target.files[0])} />
              {plan && bundle ? <Button variant="secondary" onPress={() => setConfirmation('apply-file')} isDisabled={Boolean(action) || plan.conflicts.length > 0}><RefreshCw className="size-4" />应用到 D1</Button> : null}
            </div>
            {plan ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">资源</p><p className="font-medium">{plan.resources.total}</p></div>
                  <div><p className="text-xs text-muted-foreground">版本</p><p className="font-medium">{plan.revisions}</p></div>
                  <div><p className="text-xs text-muted-foreground">资产指针</p><p className="font-medium">{plan.assets}</p></div>
                  <div><p className="text-xs text-muted-foreground">冲突</p><p className={plan.conflicts.length ? 'font-medium text-destructive' : 'font-medium text-emerald-600'}>{plan.conflicts.length}</p></div>
                </div>
                {plan.conflicts.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-destructive">{plan.conflicts.slice(0, 8).map((conflict) => <li key={conflict}>{conflict}</li>)}</ul> : null}
              </div>
            ) : null}
          </Card.Content>
        </Card>

        <Card className="studio-panel">
          <Card.Header className="studio-panel-heading">
            <Card.Title className="flex items-center gap-2 text-sm"><Github className="size-4" />GitHub 内容分支</Card.Title>
            <Card.Description>先执行只读预检；写入和导入均需要二次确认，不会把访问令牌返回浏览器。</Card.Description>
          </Card.Header>
          <Card.Content className="studio-form-content space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">仓库：</span>{config?.githubRepository || '未配置'}</p>
              <p className="mt-1"><span className="font-medium text-foreground">分支：</span>{config?.githubBranch || 'content-sync'}</p>
              <p className="mt-1">大文件继续保存在 R2，GitHub 保存 Markdown、JSON、版本清单、URL 与校验和。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onPress={() => void githubAction('preview-export')} isDisabled={Boolean(action) || !config?.hasGitHubConfig}><ShieldCheck className="size-4" />导出预检</Button>
              <Button onPress={() => setConfirmation('push')} isDisabled={Boolean(action) || !config?.hasGitHubConfig}><Upload className="size-4" />提交到 GitHub</Button>
              <Button variant="outline" onPress={() => void githubAction('preview-import')} isDisabled={Boolean(action) || !config?.hasGitHubConfig}><ShieldCheck className="size-4" />导入预检</Button>
              <Button variant="secondary" onPress={() => setConfirmation('import')} isDisabled={Boolean(action) || !config?.hasGitHubConfig}><Download className="size-4" />从 GitHub 合并</Button>
            </div>
            {importProgress !== null ? <p className="text-xs text-muted-foreground">持久化导入进度：{importProgress}%（可安全分批恢复）</p> : null}
            {exportProgress !== null ? <p className="text-xs text-muted-foreground">持久化导出进度：{exportProgress}%（按页生成，可安全恢复）</p> : null}
          </Card.Content>
        </Card>
      </section>
      <AlertDialog.Backdrop isOpen={confirmation !== null} onOpenChange={(open) => { if (!open && !action) setConfirmation(null) }}>
        <AlertDialog.Container><AlertDialog.Dialog className="sm:max-w-[420px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header><AlertDialog.Icon status="warning" /><AlertDialog.Heading>确认执行写入操作</AlertDialog.Heading></AlertDialog.Header>
          <AlertDialog.Body><p>{confirmationCopy}</p><p className="text-muted mt-2 text-sm">系统会保留校验与回滚信息，但仍建议先完成只读预检。</p></AlertDialog.Body>
          <AlertDialog.Footer><Button onPress={() => setConfirmation(null)} variant="tertiary">取消</Button><Button onPress={confirmPendingAction}>确认执行</Button></AlertDialog.Footer>
        </AlertDialog.Dialog></AlertDialog.Container>
      </AlertDialog.Backdrop>
    </main>
  )
}
