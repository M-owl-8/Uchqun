import { MessageSquare, X, AlertTriangle, ChevronsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeLong } from '@shared/utils/formatDate';
import LoadingSpinner from '../../components/LoadingSpinner';

// PL-009: uz/ru strings use defaultValue — require professional review before beta.

const LEVEL_BADGES = {
  owner:    { label: 'Maktab',     cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  region:   { label: 'Viloyat',    cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  republic: { label: 'Respublika', cls: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
};

const LevelBadge = ({ level, t }) => {
  const badge = LEVEL_BADGES[level];
  if (!badge) return null;
  return (
    <span
      data-testid={`level-badge-${level}`}
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}
    >
      {t(`message.level_${level}`)}
    </span>
  );
};

/**
 * Parent messages history modal — CP-022.
 *
 * Props:
 *   show             boolean
 *   onClose          () → void
 *   messages         Message[]
 *   loadingMessages  boolean
 *   messagesError    string | null
 *   onEscalate       ({ messageId, subject, currentLevel }) → void
 */
const MessagesModal = ({
  show,
  onClose,
  messages,
  loadingMessages,
  messagesError = null,
  onEscalate,
}) => {
  const { t, i18n } = useTranslation();

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-success-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t('profile.myMessages')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Cold-load error */}
        {messagesError && (
          <div
            data-testid="messages-error"
            className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl flex items-center gap-2 text-error-700 text-sm"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {messagesError}
          </div>
        )}

        {loadingMessages ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('profile.noMessages')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">{msg.subject}</h3>
                      {msg.recipientLevel && (
                        <LevelBadge level={msg.recipientLevel} t={t} />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatDateTimeLong(msg.createdAt, i18n.language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {msg.reply && (
                      <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-xs font-semibold">
                        {t('profile.replied')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Escalation chain indicator */}
                {msg.escalatedFrom && (
                  <div
                    data-testid={`escalation-chain-${msg.id}`}
                    className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-700">
                      <span className="font-semibold">
                        {t('message.escalatedFrom')}
                      </span>{' '}
                      <span className="truncate">{msg.escalatedFrom.subject}</span>
                    </span>
                  </div>
                )}

                {/* Message body */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {t('profile.yourMessage')}:
                  </p>
                  <p className="text-slate-800 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap">{msg.message}</p>
                </div>

                {/* Government reply */}
                {msg.reply && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-brand-100 rounded-full">
                        <MessageSquare className="w-4 h-4 text-brand-600" />
                      </div>
                      <p className="text-sm font-medium text-brand-700">
                        {t('profile.governmentReply')}
                      </p>
                      <span className="text-xs text-slate-500 ml-auto">
                        {formatDateTimeLong(msg.repliedAt, i18n.language)}
                      </span>
                    </div>
                    <p className="text-slate-800 bg-brand-50 rounded-lg p-4 whitespace-pre-wrap">{msg.reply}</p>
                  </div>
                )}

                {/* Escalate action */}
                {onEscalate && msg.recipientLevel !== 'republic' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => onEscalate({
                        messageId: msg.id,
                        subject: msg.subject,
                        currentLevel: msg.recipientLevel,
                      })}
                      data-testid={`escalate-btn-${msg.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                      {t('message.escalate')}
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

export default MessagesModal;
