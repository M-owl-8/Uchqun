import { useTranslation } from 'react-i18next';
import { Shield, FileText, CheckCircle, XCircle, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';

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
}) => {
  const { t } = useTranslation();

  const getDocumentStatusBadge = (document) => {
    if (document.status === 'approved') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          {t('receptionsPage.docStatus.approved')}
        </span>
      );
    } else if (document.status === 'rejected') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          {t('receptionsPage.docStatus.rejected')}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          {t('receptionsPage.docStatus.pending')}
        </span>
      );
    }
  };

  if (!reception) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{t('receptionsPage.selectPrompt')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {reception.firstName} {reception.lastName}
            </h2>
            <p className="text-sm text-gray-600">{reception.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(reception)}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
            >
              <Edit2 className="inline w-4 h-4 mr-1" />
              {t('receptionsPage.editBtn')}
            </button>
            <button
              onClick={() => onDelete(reception.id)}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="inline w-4 h-4 mr-1" />
              {t('receptionsPage.deleteBtn')}
            </button>
            {reception.isActive ? (
              <button
                onClick={() => onDeactivate(reception.id)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                <UserX className="inline w-4 h-4 mr-1" />
                {t('receptionsPage.deactivate')}
              </button>
            ) : (
              <button
                onClick={() => onActivate(reception.id)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
              >
                <UserCheck className="inline w-4 h-4 mr-1" />
                {t('receptionsPage.activate')}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">{t('receptionsPage.documents')}</h3>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('receptionsPage.noDocuments')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{document.fileName}</span>
                      {getDocumentStatusBadge(document)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('receptionsPage.docType')}: {document.documentType}
                    </p>
                    {document.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">
                        {t('receptionsPage.rejectionReason')}: {document.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
                {document.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onApprove(document.id)}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="inline w-4 h-4 mr-1" />
                      {t('receptionsPage.approve')}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt(t('receptionsPage.rejectionPrompt'));
                        if (reason) onReject(document.id, reason);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="inline w-4 h-4 mr-1" />
                      {t('receptionsPage.reject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionDetailPanel;
