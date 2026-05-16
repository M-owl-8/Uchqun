import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import {
  Search,
  Check,
  Eye,
  X,
  FileText,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

const CACHE_KEY = 'admin:documents';
const PAGE_SIZE = 6;

const DOC_TABS = ['pending', 'approved', 'rejected'];
const TAB_LABELS = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };

const DocCard = ({ doc, onApprove, onView, onReject, approving, rejecting }) => {
  const uploaderName = doc.reception
    ? `${doc.reception.firstName || ''} ${doc.reception.lastName || ''}`.trim()
    : 'Noma\'lum';
  const initials = uploaderName.slice(0, 2).toUpperCase();
  const timeAgo = doc.createdAt
    ? `${Math.floor((Date.now() - new Date(doc.createdAt)) / 3600000)} soat oldin`
    : '';
  const isStale = doc.daysOld >= 3;
  const hasPreview = doc.fileUrl || doc.fileType?.startsWith('image/');

  return (
    <article className={`bg-surface border rounded-lg shadow-xs p-5 relative ${isStale ? 'border-warning-100' : 'border-warm-200'}`}>
      {isStale && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-sm bg-warning-50 text-warning-700 border border-warning-100">
          {doc.daysOld} kun
        </div>
      )}

      <div className={`flex items-center gap-3 mb-4 ${isStale ? 'pr-14' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-sm font-semibold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warm-900">{uploaderName}</p>
          <p className="text-xs text-warm-500 num">Qabulxona · {timeAgo}</p>
        </div>
        {!isStale && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-warning-50 text-warning-700 border border-warning-100">
            Kutilmoqda
          </span>
        )}
      </div>

      {/* Preview */}
      {hasPreview ? (
        <div className="doc-preview h-32 rounded-md border border-warm-200 mb-4 relative">
          <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-sm bg-surface/90 backdrop-blur border border-warm-200 text-warm-700">
            <FileText className="w-3 h-3" strokeWidth={1.75} />
            {doc.documentType || doc.fileType || 'Hujjat'}
          </div>
          {doc.fileSize && (
            <p className="absolute bottom-2 right-2 text-[10px] text-warm-500 num bg-surface/80 px-1.5 py-0.5 rounded-sm">
              {doc.fileSize}
            </p>
          )}
        </div>
      ) : (
        <div className="h-32 rounded-md border border-warm-200 mb-4 bg-warm-50 flex flex-col items-center justify-center text-warm-400">
          <FileQuestion className="w-8 h-8" strokeWidth={1.5} />
          <p className="text-xs mt-2">Oldindan ko&apos;rish mavjud emas</p>
          {doc.fileType && <p className="text-[10px] num">{doc.fileType.toUpperCase()} · {doc.fileSize || ''}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1 justify-center"
          onClick={() => onApprove(doc.id)}
          loading={approving === doc.id}
          disabled={!!approving || !!rejecting}
        >
          <Check className="w-4 h-4 mr-1" strokeWidth={2} />
          Tasdiqlash
        </Button>
        {doc.fileUrl && (
          <button
            aria-label="Ko'rish"
            onClick={() => onView(doc)}
            className="inline-flex items-center justify-center h-10 px-3 text-sm bg-surface border border-warm-300 hover:bg-warm-50 text-warm-800 rounded-md"
          >
            <Eye className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
        <button
          aria-label="Rad etish"
          onClick={() => onReject(doc)}
          className="inline-flex items-center justify-center h-10 px-3 text-sm text-error-700 hover:bg-error-50 rounded-md"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </article>
  );
};

const DocumentApprovalQueue = () => {
  const { t } = useTranslation();
  const [docs, setDocs]           = useState(() => cache.get(CACHE_KEY) ?? { pending: [], approved: [], rejected: [] });
  const [loading, setLoading]     = useState(!cache.get(CACHE_KEY));
  const [tab, setTab]             = useState('pending');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectDoc, setRejectDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDocs = useCallback(async (signal) => {
    const [pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
      api.get('/admin/documents/pending', { signal }),
      api.get('/admin/documents?status=approved', { signal }),
      api.get('/admin/documents?status=rejected', { signal }),
    ]);

    return {
      pending:  pendingRes.status  === 'fulfilled' ? (pendingRes.value?.data?.data  || pendingRes.value?.data  || []) : [],
      approved: approvedRes.status === 'fulfilled' ? (approvedRes.value?.data?.data || approvedRes.value?.data || []) : [],
      rejected: rejectedRes.status === 'fulfilled' ? (rejectedRes.value?.data?.data || rejectedRes.value?.data || []) : [],
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDocs(controller.signal)
      .then((data) => { cache.set(CACHE_KEY, data); setDocs(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchDocs]);

  const handleApprove = async (id) => {
    setApproving(id);
    try {
      await api.put(`/admin/documents/${id}/approve`);
      const approved = docs.pending.find((d) => d.id === id);
      setDocs((prev) => ({
        ...prev,
        pending:  prev.pending.filter((d) => d.id !== id),
        approved: approved ? [{ ...approved, status: 'approved' }, ...prev.approved] : prev.approved,
      }));
    } catch {
      // TODO(phase-2): show error toast
    } finally {
      setApproving(null);
    }
  };

  const handleView = (doc) => {
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const openReject = (doc) => { setRejectDoc(doc); setRejectReason(''); };
  const closeReject = () => { setRejectDoc(null); setRejectReason(''); };

  const handleReject = async () => {
    if (!rejectDoc) return;
    setRejecting(rejectDoc.id);
    try {
      await api.put(`/admin/documents/${rejectDoc.id}/reject`, { reason: rejectReason });
      setDocs((prev) => ({
        ...prev,
        pending:  prev.pending.filter((d) => d.id !== rejectDoc.id),
        rejected: [{ ...rejectDoc, status: 'rejected' }, ...prev.rejected],
      }));
      closeReject();
    } catch {
      // TODO(phase-2): show error toast
    } finally {
      setRejecting(null);
    }
  };

  const tabDocs = docs[tab] || [];
  const filtered = tabDocs.filter((d) => {
    if (!search) return true;
    const name = `${d.reception?.firstName || ''} ${d.reception?.lastName || ''} ${d.documentType || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageDocs   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="letterhead pt-4 flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Hujjatlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('documents.title', { defaultValue: 'Tasdiqlash navbati' })}
          </h1>
          <p className="text-base text-warm-600 mt-1">
            {docs.pending.length > 0
              ? `${docs.pending.length} ta hujjat sizning e'tiboringizni kutmoqda.`
              : t('documents.noPending', { defaultValue: 'Hozircha tasdiq kutayotgan hujjat yo\'q.' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" strokeWidth={1.75} />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Xodim yoki hujjat turi..."
              className="h-10 pl-9 pr-3.5 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 w-64 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-warm-200 mb-6">
        {DOC_TABS.map((t_) => (
          <button
            key={t_}
            onClick={() => { setTab(t_); setPage(1); }}
            className={`relative pb-3 pt-1 text-sm font-medium transition-colors ${
              tab === t_ ? 'text-warm-900' : 'text-warm-500 hover:text-warm-900'
            }`}
          >
            {TAB_LABELS[t_]}
            <span className="num text-xs ml-1 text-warm-500">{docs[t_]?.length || 0}</span>
            {tab === t_ && <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-brand-600 rounded-full" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
              <div className="flex items-center gap-3 mb-4"><div className="skel w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><div className="skel h-3.5 w-32" /><div className="skel h-3 w-48" /></div></div>
              <div className="skel h-32 w-full rounded-md mb-4" />
              <div className="flex gap-2"><div className="skel h-9 flex-1 rounded-md" /><div className="skel h-9 w-10 rounded-md" /><div className="skel h-9 w-10 rounded-md" /></div>
            </div>
          ))}
        </div>
      ) : pageDocs.length === 0 ? (
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-success-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-success-600" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-warm-900">
            {search ? `"${search}" so'roviga mos hujjat topilmadi` : 'Tasdiq kutayotgan hujjat yo\'q'}
          </p>
          <p className="text-sm text-warm-500 mt-1 max-w-xs mx-auto">
            {search
              ? 'Qidiruvni o\'zgartiring yoki tozalang.'
              : 'Hammasi ko\'rib chiqilgan. Qabulxona yangi hujjat yuklaganda bu yerda paydo bo\'ladi.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-surface border border-warm-300 hover:bg-warm-50 text-warm-800 rounded-md"
            >
              Filtrni tozalash
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pageDocs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                onApprove={handleApprove}
                onView={handleView}
                onReject={openReject}
                approving={approving}
                rejecting={rejecting}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-warm-500 num">
                Ko&apos;rsatilmoqda <span className="text-warm-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> / jami <span className="text-warm-800">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center justify-center w-8 h-8 text-warm-500 hover:bg-warm-100 rounded-md disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm num font-medium ${p === page ? 'bg-brand-600 text-white' : 'text-warm-700 hover:bg-warm-100'}`}>{p}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center justify-center w-8 h-8 text-warm-500 hover:bg-warm-100 rounded-md disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      <Modal
        isOpen={!!rejectDoc}
        onClose={closeReject}
        title="Hujjatni rad etish"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={closeReject} disabled={!!rejecting}>Bekor qilish</Button>
            <Button variant="danger" onClick={handleReject} loading={!!rejecting} disabled={!rejectReason.trim()}>
              Rad etish
            </Button>
          </div>
        }
      >
        {rejectDoc && (
          <div className="space-y-3">
            <p className="text-xs text-warm-500">
              {rejectDoc.reception?.firstName} {rejectDoc.reception?.lastName} · {rejectDoc.documentType || 'Hujjat'}
            </p>
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1.5">
                Rad etish sababi <span className="text-error-600">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-warm-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 text-warm-900 placeholder:text-warm-400"
                placeholder="Misol: hujjat sifati past, qaytadan yuklang. Iltimos, aniq va to'liq variantni yuboring."
              />
            </div>
            <p className="text-xs text-warm-500">Xabar email orqali yuboriladi.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentApprovalQueue;
