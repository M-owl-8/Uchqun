import { useState, useRef } from 'react';
import { UploadCloud, FileText, FileCheck2, FileX2, X, MoreHorizontal, Check } from 'lucide-react';

function FileRow({ file, onRemove }) {
  const { name, size, status, progress, rejectionReason, uploadedAt } = file;

  const sizeStr = size ? (size / 1024 / 1024).toFixed(1) + ' MB' : '';
  const dateStr = uploadedAt ? new Date(uploadedAt).toLocaleDateString('uz-Latn-UZ') : '';

  if (status === 'uploading') {
    return (
      <div className="bg-paper border border-slate-200 rounded-md px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-error-50 text-error-700 inline-flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13.5px] font-medium text-slate-900 truncate">{name}</div>
            <div className="text-[12px] font-mono text-slate-500 shrink-0">{sizeStr} · {progress || 0} %</div>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-1 rounded-full bg-brand-600 transition-all" style={{ width: `${progress || 0}%` }} />
          </div>
        </div>
        {onRemove && (
          <button onClick={() => onRemove(file.id)} className="text-slate-500 hover:text-slate-800 p-1">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="bg-paper border border-slate-200 rounded-md px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-warning-50 text-warning-700 inline-flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium text-slate-900 truncate">{name}</div>
          <div className="mt-0.5 text-[12px] text-slate-500 num">{sizeStr}{dateStr ? ` · yuklandi ${dateStr}` : ''}</div>
        </div>
        <span className="inline-flex items-center h-6 px-2 rounded-sm bg-warning-50 text-warning-700 text-[12px] border border-warning-100 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-warning-600 mr-1.5" />
          Ko'rib chiqilmoqda
        </span>
        <button className="text-slate-500 hover:text-slate-800 p-1">
          <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="bg-paper border border-slate-200 rounded-md px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-success-50 text-success-700 inline-flex items-center justify-center shrink-0">
          <FileCheck2 className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium text-slate-900 truncate">{name}</div>
          <div className="mt-0.5 text-[12px] text-slate-500 num">{sizeStr}{dateStr ? ` · tasdiqlandi ${dateStr}` : ''}</div>
        </div>
        <span className="inline-flex items-center h-6 px-2 rounded-sm bg-success-50 text-success-700 text-[12px] border border-success-100 shrink-0">
          <Check className="w-3 h-3 mr-1.5" strokeWidth={2} />
          Tasdiqlangan
        </span>
        {file.url && (
          <a href={file.url} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-700 hover:text-brand-800 font-medium px-2 shrink-0">
            Ko'rish
          </a>
        )}
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-paper border border-error-100 rounded-md px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-error-50 text-error-700 inline-flex items-center justify-center shrink-0">
            <FileX2 className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium text-slate-900 truncate">{name}</div>
            <div className="mt-0.5 text-[12px] text-slate-500 num">{sizeStr}{dateStr ? ` · yuklandi ${dateStr}` : ''}</div>
          </div>
          <span className="inline-flex items-center h-6 px-2 rounded-sm bg-error-50 text-error-700 text-[12px] border border-error-100 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-error-600 mr-1.5" />
            Rad etilgan
          </span>
        </div>
        {rejectionReason && (
          <div className="mt-2.5 ml-12 text-[12.5px] text-error-700 bg-error-50 border border-error-100 rounded px-3 py-2">
            <span className="font-medium">Sabab:</span> {rejectionReason}
          </div>
        )}
        {onRemove && (
          <button className="mt-2 ml-12 text-[12.5px] text-brand-700 hover:text-brand-800 font-medium" onClick={() => onRemove(file.id)}>
            Yangisini yuklash
          </button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * DocumentUpload — drop zone + file list.
 *
 * Props:
 *   files      — array of { id, name, size, status, progress, uploadedAt, rejectionReason, url }
 *   onUpload   — (file: File) => void
 *   onRemove   — (id) => void
 *   disabled   — if true, shows locked state
 *   label      — drop zone label
 */
export default function DocumentUpload({
  files = [],
  onUpload,
  onRemove,
  disabled = false,
  label = "Hujjatlarni shu yerga tashlang yoki bosing",
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && onUpload) onUpload(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onUpload) onUpload(file);
    e.target.value = '';
  };

  return (
    <div>
      {/* Drop zone */}
      {disabled ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
          <UploadCloud className="w-8 h-8 mx-auto text-slate-300" strokeWidth={2} />
          <div className="mt-3 text-[14px] font-medium text-slate-400">Yuklash mavjud emas</div>
          <div className="mt-1 text-[12.5px] text-slate-400">Hujjat allaqachon tasdiqlangan</div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-brand-600 bg-brand-50/60'
              : 'border-slate-300 bg-paper hover:border-brand-400 hover:bg-brand-50/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud
            className={`w-8 h-8 mx-auto ${dragging ? 'text-brand-700' : 'text-slate-400'}`}
            strokeWidth={2}
          />
          <div className={`mt-3 text-[14px] font-medium ${dragging ? 'text-brand-800' : 'text-slate-800'}`}>
            {dragging ? "Qo'yib yuboring" : label}
          </div>
          <div className={`mt-1 text-[12.5px] ${dragging ? 'text-brand-700/80' : 'text-slate-500'}`}>
            {dragging ? 'Fayl yuklanadi' : 'PDF, JPG, PNG · maks. 10 MB'}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}

      {/* File rows */}
      {files.length > 0 && (
        <div className="mt-5 space-y-2.5">
          {files.map((file) => (
            <FileRow key={file.id} file={file} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
