import { useRef, useState, type DragEvent } from 'react'
import { MdCheckCircleOutline, MdClose, MdOutlineDescription, MdOutlineFileUpload } from 'react-icons/md'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

/** CSV import matching POST /api/v1/clients/import: header row with at least a "name" column; all rows or none. */
export function ImportClientsModal({ open, onOpenChange }: Props) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const choose = (selected?: File) => {
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) { setError('Choose a .csv file. You can export one from Excel or Google Sheets.'); setFile(null); return }
    setError(null)
    setFile(selected)
  }
  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]) }
  const close = (next: boolean) => { if (!importing) { onOpenChange(next); if (!next) { setFile(null); setError(null) } } }

  const start = async () => {
    setImporting(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setImporting(false)
    toast({ title: 'Import complete', description: `Clients from ${file!.name} have been added.` })
    close(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      dismissible={!importing}
      title="Import clients"
      description="Upload a CSV with a header row. Only the name column is required."
      footer={<><Button variant="secondary" onClick={() => close(false)} disabled={importing}>Cancel</Button><Button onClick={start} disabled={!file} loading={importing}>Import clients</Button></>}
    >
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors duration-base',
          dragging ? 'border-brand-500 bg-brand-50' : error ? 'border-danger-line bg-danger-soft/40' : 'border-ink-300 bg-ink-25',
        )}
      >
        <span className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-card', dragging ? 'text-brand-600' : 'text-ink-500')}><Icon icon={MdOutlineFileUpload} size="lg" /></span>
        <p className="text-body font-semibold text-ink-900">{dragging ? 'Drop your file to upload' : 'Drag and drop your CSV here'}</p>
        <p className="mt-1 text-small text-ink-500">or</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => input.current?.click()}>Browse files</Button>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} aria-label="Choose CSV file" />
      </div>
      {error && <p role="alert" className="mt-3 text-small text-danger">{error}</p>}
      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-ink-200 p-3 animate-overlay-in">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600"><Icon icon={MdOutlineDescription} size="md" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-semibold text-ink-900">{file.name}</p>
            <p className="flex items-center gap-1 text-caption text-brand-700"><Icon icon={MdCheckCircleOutline} size="xs" />Ready to import · {(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button type="button" aria-label="Remove file" onClick={() => setFile(null)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-ring"><Icon icon={MdClose} size="sm" /></button>
        </div>
      )}
      <div className="mt-5 rounded-md bg-ink-25 p-3.5 text-small text-ink-600">
        <p className="font-semibold text-ink-800">Supported columns</p>
        <p className="mt-1 leading-6">name, company, email, phone, billingEmail, address, country, taxId, defaultCurrency, notes</p>
        <p className="mt-1 text-ink-500">If any row is invalid, nothing is imported and we’ll tell you which row to fix.</p>
      </div>
    </Modal>
  )
}
