import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, XCircle, Edit2, Trash2, UserCheck, UserX, X } from 'lucide-react';
import ConfirmDialog from '@shared/components/ConfirmDialog';

const DocStatusBadge = ({ status, t }) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-success-50 text-success-700 border border-success-100">
        {t('receptionsPage.docStatus.approved')}
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-error-50 text-error-700 border border-error-100">
        {t('receptionsPage.docStatus.rejected')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-warning-50 text-warning-700 border border-warning-100">
      {t('receptionsPage.docStatus.pending')}
    </span>
  );
};

const ReceptionDetailPanel = ({
  reception,
  documents,
  actionLoading,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onApprove,
  onReject,
  onClose,
}) => {
  const { t } = useTranslation();
  const [confirmDialog, setConfirmDialog] = useState(null);

  if (!reception) return null;

  return (
    <div className="bg-surface border border-warm-200 rounded-lg shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-warm-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-warm-900">
              {reception.firstName} {reception.lastName}
            </p>
            <p className="text-sm text-warm-600 mt-0.5">{reception.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors shrink-0"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => onEdit(reception)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 disabled:opacity-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('receptionsPage.editBtn')}
          </button>
          {reception.isActive ? (
            <button
              onClick={() => onDeactivate(reception.id)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-error-700 bg-error-50 border border-error-100 rounded-md hover:bg-error-100 disabled:opacity-50 transition-colors"
            >
              <UserX className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('receptionsPage.deactivate')}
            </button>
          ) : (
            <button
              onClick={() => onActivate(reception.id)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-success-700 bg-success-50 border border-success-100 rounded-md hover:bg-success-100 disabled:opacity-50 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('receptionsPage.activate')}
            </button>
          )}
          <button
            onClick={() => onDelete(reception.id)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-error-700 bg-error-50 border border-error-100 rounded-md hover:bg-error-100 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('receptionsPage.deleteBtn')}
          </button>
        </div>
      </div>

      {/* Documents */}
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-warm-500 mb-3">
          {t('receptionsPage.documents')}
        </p>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto rounded-full bg-warm-100 flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-warm-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-warm-500">{t('receptionsPage.noDocuments')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3.5 border border-warm-200 rounded-md bg-cream/60">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
                    <span className="font-medium text-warm-900 text-sm truncate">{doc.fileName}</span>
                  </div>
                  <DocStatusBadge status={doc.status} t={t} />
                </div>
                <p className="text-xs text-warm-500 ml-6">
                  {t('receptionsPage.docType')}: {doc.documentType}
                </p>
                {doc.rejectionReason && (
                  <p className="text-xs text-error-600 mt-1 ml-6">
                    {t('receptionsPage.rejectionReason')}: {doc.rejectionReason}
                  </p>
                )}
                {doc.status === 'pending' && (
                  <div className="flex gap-2 mt-3 ml-6">
                    <button
                      onClick={() => onApprove(doc.id)}
                      disabled={actionLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-xs font-medium text-success-700 bg-success-50 border border-success-100 rounded-md hover:bg-success-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {t('receptionsPage.approve')}
                    </button>
                    <button
                      onClick={() => setConfirmDialog({
                        message: t('receptionsPage.rejectionPrompt', { defaultValue: 'Rad etish sababini kiriting' }),
                        requireReason: true,
                        onConfirm: (reason) => {
                          setConfirmDialog(null);
                          onReject(doc.id, reason);
                        },
                      })}
                      disabled={actionLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-xs font-medium text-error-700 bg-error-50 border border-error-100 rounded-md hover:bg-error-100 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {t('receptionsPage.reject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
};

export default ReceptionDetailPanel;
