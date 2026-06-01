import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import DocumentUpload from '../components/DocumentUpload';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { useToast } from '@shared/context/ToastContext';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CACHE_KEY = 'reception:documents';

export default function Documents() {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [docs, setDocs] = useState(() => cache.get(CACHE_KEY) || []);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));
  const [fetchError, setFetchError] = useState(null);
  const [documentType, setDocumentType] = useState('license');
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadDocs = useCallback(async (bust = false) => {
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) { setDocs(cached); setLoading(false); return; }
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/reception/documents');
      const d = Array.isArray(res.data.data) ? res.data.data : [];
      cache.set(CACHE_KEY, d);
      setDocs(d);
    } catch (err) {
      setFetchError(err.response?.data?.error || t('documents.loadError', { defaultValue: 'Hujjatlarni yuklashda xatolik.' }));
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Poll every 30 s so document status updates from admin approval are reflected
  // without requiring a manual refresh (reception portal has no socket context).
  useEffect(() => {
    const id = setInterval(() => loadDocs(true), 30000);
    return () => clearInterval(id);
  }, [loadDocs]);

  const handleUpload = async (file) => {
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      showError(t('documents.fileSizeLimit', { maxMB, defaultValue: `Fayl hajmi ${maxMB} MB dan oshmasin.` }));
      return;
    }
    const tempId = `tmp-${Date.now()}`;
    setDocs((prev) => [...prev, { id: tempId, name: file.name, size: file.size, status: 'uploading', progress: 0 }]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      await api.post('/reception/documents', formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100);
          setDocs((prev) => prev.map((d) => d.id === tempId ? { ...d, progress: pct } : d));
        },
      });
      success(t('documents.uploadSuccess', { defaultValue: 'Hujjat yuklandi. Admin tasdiqlashi kutilmoqda.' }));
      loadDocs(true);
    } catch (err) {
      showError(err.response?.data?.error || t('documents.uploadError', { defaultValue: "Hujjat yuklanmadi. Qayta urinib ko'ring." }));
      setDocs((prev) => prev.filter((d) => d.id !== tempId));
    }
  };

  const handleRemove = (id) => {
    if (!id || id.startsWith('tmp-')) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
      return;
    }
    setConfirmDialog({
      message: t('documents.confirmDelete', { defaultValue: "Bu hujjatni o'chirmoqchimisiz?" }),
      warning: t('documents.confirmDeleteWarning', { defaultValue: "Hujjatni o'chirsangiz, uni qayta yuklashingiz va admin tomonidan qayta tasdiqlatishingiz kerak bo'ladi." }),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/reception/documents/${id}`);
          loadDocs(true);
        } catch (err) {
          const code = err?.response?.data?.error;
          if (code === 'DOCUMENT_CANNOT_DELETE_NON_PENDING') {
            showError(t('documents.deleteNonPendingError', { defaultValue: 'Faqat kutilayotgan hujjatlarni o\'chirish mumkin.' }));
          } else {
            showError(t('documents.deleteError', { defaultValue: 'Hujjatni o\'chirib bo\'lmadi.' }));
          }
        }
      },
    });
  };

  const approvedCount = docs.filter((d) => d.status === 'approved').length;
  const pendingCount = docs.filter((d) => d.status === 'pending').length;
  const rejectedCount = docs.filter((d) => d.status === 'rejected').length;
  const allApproved = docs.length > 0 && docs.every((d) => d.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h1 className="h1-tab text-[28px] font-semibold tracking-tight text-slate-900">
          {t('documents.title', { defaultValue: 'Mening hujjatlarim' })}
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-1.5">
          {t('documents.subtitle', { defaultValue: 'Hujjatlarni yuklang va admin tasdiqlashini kuting.' })}
        </p>
      </header>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-error-50 border border-error-100 text-[13px] text-error-700">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={2} />
          <div>{fetchError}</div>
        </div>
      )}

      {/* Status banner */}
      {!fetchError && allApproved ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-success-50 border border-success-100 text-[13px] text-success-700">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ fill: '#DFE4BE', stroke: '#5C7329' }} strokeWidth={2.4} />
          <div>
            <div className="font-medium">Barcha hujjatlar tasdiqlangan</div>
            <div className="text-success-700/80 mt-0.5">{"Siz to'liq vakolatga egasiz."}</div>
          </div>
        </div>
      ) : !fetchError && (pendingCount > 0 || rejectedCount > 0) ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-50 border border-warning-100 text-[13px] text-warning-700">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={2} />
          <div>
            <div className="font-medium">
              {pendingCount > 0 && `${pendingCount} ta hujjat tasdiq kutmoqda`}
              {pendingCount > 0 && rejectedCount > 0 && ' · '}
              {rejectedCount > 0 && `${rejectedCount} ta rad etilgan`}
            </div>
            <div className="mt-0.5">{"Maktab rahbari bilan bog'laning yoki yangisini yuklang."}</div>
          </div>
        </div>
      ) : null}

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        {/* Left: upload zone + file list */}
        <div className="space-y-5">
          <div className="bg-surface border border-slate-200 rounded-lg shadow-xs p-5">
            <h2 className="h2-tab text-[15px] font-semibold text-slate-900 mb-4">
              {t('documents.upload', { defaultValue: 'Hujjat yuklash' })}
            </h2>

            {/* Document type selector */}
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                {t('documents.documentType', { defaultValue: 'Hujjat turi' })}
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full text-[13.5px] border border-slate-200 rounded-md px-3 py-2 bg-paper text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="license">{t('documents.type.license', { defaultValue: 'Litsenziya' })}</option>
                <option value="certificate">{t('documents.type.certificate', { defaultValue: 'Sertifikat' })}</option>
                <option value="identification">{t('documents.type.identification', { defaultValue: 'Shaxsni tasdiqlovchi hujjat' })}</option>
                <option value="other">{t('documents.type.other', { defaultValue: 'Boshqa' })}</option>
              </select>
            </div>

            <DocumentUpload
              files={docs}
              onUpload={handleUpload}
              onRemove={handleRemove}
            />
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Progress card */}
          <div className="bg-surface border border-slate-200 rounded-lg shadow-xs p-5">
            <h3 className="text-[14px] font-semibold text-slate-900 mb-4">
              {t('documents.progress', { defaultValue: 'Holat' })}
            </h3>
            {loading ? (
              <div className="text-[13px] text-slate-400">
                {t('documents.loading', { defaultValue: 'Yuklanmoqda...' })}
              </div>
            ) : (
              <dl className="divide-y divide-slate-100 text-[13.5px]">
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Tasdiqlangan</dt>
                  <dd className="num font-semibold text-success-700">{approvedCount}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">{"Ko'rib chiqilmoqda"}</dt>
                  <dd className="num font-semibold text-warning-700">{pendingCount}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Rad etilgan</dt>
                  <dd className="num font-semibold text-error-700">{rejectedCount}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Jami</dt>
                  <dd className="num font-semibold text-slate-900">{docs.length}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Help card */}
          <div className="bg-surface border border-slate-200 rounded-lg shadow-xs p-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900 mb-3">
              <HelpCircle className="w-4 h-4 text-info-600" strokeWidth={2} />
              {t('documents.help', { defaultValue: 'Yordam' })}
            </div>
            <ul className="text-[13px] text-slate-600 space-y-1.5">
              <li>· PDF, JPG, PNG formatlar qabul qilinadi</li>
              <li>· Maksimal fayl hajmi 10 MB</li>
              <li>{"· Admin 1-3 ish kuni ichida ko'rib chiqadi"}</li>
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[12.5px] text-slate-500">
              Savollar uchun:{' '}
              <a href="mailto:support@ihma.uz" className="text-brand-700 hover:text-brand-800">
                support@ihma.uz
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
  );
}
