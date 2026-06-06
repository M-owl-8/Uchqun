import { useState, useEffect } from 'react';
import { MessageSquare, Send, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/context/ToastContext';
import api from '../../services/api';

// PL-009: uz/ru strings below use defaultValue — require professional review before beta.

const LEVELS = [
  {
    key: 'owner',
    label: 'Maktab',
    labelKey: 'message.levelOwner',
    desc: 'Maktab direktori',
    descKey: 'message.levelOwnerDesc',
    color: 'amber',
    selectedClass: 'bg-amber-100 border-amber-400 text-amber-800',
    idleClass: 'bg-white border-slate-200 text-slate-600 hover:border-amber-300',
  },
  {
    key: 'region',
    label: 'Viloyat',
    labelKey: 'message.levelRegion',
    desc: 'Viloyat hokimligi',
    descKey: 'message.levelRegionDesc',
    color: 'blue',
    selectedClass: 'bg-blue-100 border-blue-400 text-blue-800',
    idleClass: 'bg-white border-slate-200 text-slate-600 hover:border-blue-300',
  },
  {
    key: 'republic',
    label: 'Respublika',
    labelKey: 'message.levelRepublic',
    desc: 'Milliy hukumat',
    descKey: 'message.levelRepublicDesc',
    color: 'indigo',
    selectedClass: 'bg-indigo-100 border-indigo-400 text-indigo-800',
    idleClass: 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300',
  },
];

const NEXT_LEVEL = { owner: 'region', region: 'republic', republic: 'republic' };

const ERROR_CODES = {
  MESSAGE_SUBJECT_REQUIRED: 'Mavzu kiritilishi shart.',
  MESSAGE_BODY_REQUIRED: 'Xabar matni kiritilishi shart.',
  MESSAGE_RECIPIENT_LEVEL_INVALID: 'Qabul qiluvchi darajasini tanlang.',
  MESSAGE_ESCALATE_NOT_OWN: 'Siz faqat o\'z xabarlaringizni ko\'tarishingiz mumkin.',
  MESSAGE_ESCALATE_NOT_FOUND: 'Ko\'tariladigan xabar topilmadi.',
};

/**
 * Parent compose modal — CP-022.
 *
 * Props:
 *   show              boolean
 *   onClose           () → void
 *   onSent            (messages: Message[]) → void
 *   escalatedFromId   string | null   — the prior message ID (escalation flow)
 *   escalatedFromSubject string | null — shown in escalation header
 *   escalatedFromLevel  'owner'|'region'|'republic'|null — defaults nextLevel
 */
const MessageModal = ({
  show,
  onClose,
  onSent,
  escalatedFromId = null,
  escalatedFromSubject = null,
  escalatedFromLevel = null,
}) => {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [recipientLevel, setRecipientLevel] = useState('republic');
  const [sending, setSending] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();

  // When opened for escalation, pre-select the next level.
  useEffect(() => {
    if (show && escalatedFromLevel) {
      setRecipientLevel(NEXT_LEVEL[escalatedFromLevel] ?? 'republic');
    } else if (show && !escalatedFromLevel) {
      setRecipientLevel('republic');
    }
  }, [show, escalatedFromLevel]);

  if (!show) return null;

  const handleClose = () => {
    setSubject('');
    setText('');
    setRecipientLevel('republic');
    onClose();
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toastError(t('message.errorSubjectRequired'));
      return;
    }
    if (!text.trim()) {
      toastError(t('message.errorBodyRequired'));
      return;
    }
    setSending(true);
    try {
      await api.post('/parent/message-to-government', {
        subject: subject.trim(),
        message: text.trim(),
        recipientLevel,
        ...(escalatedFromId ? { escalatedFromId } : {}),
      });
      toastSuccess(t('profile.messageSent'));
      setSubject('');
      setText('');
      onClose();
      const response = await api.get('/parent/messages');
      onSent(response.data.data || []);
    } catch (error) {
      const code = error?.response?.data?.error;
      const msg = code
        ? ((() => {
            // S2b: explicit resolution — backend codes are unbounded, but no
            // defaultValue mask. If the key isn't in the catalog the explicit
            // fallback chain handles it.
            const k = `message.err_${code}`;
            const tr = t(k);
            return tr !== k ? tr : (ERROR_CODES[code] || t('profile.messageError'));
          })())
        : (error.response?.data?.message || t('profile.messageError'));
      toastError(msg);
    } finally {
      setSending(false);
    }
  };

  const selectedLevel = LEVELS.find((l) => l.key === recipientLevel);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="bg-surface rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {escalatedFromId
                ? t('message.escalateTitle')
                : t('profile.contactGovernment')}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Escalation notice */}
        {escalatedFromId && escalatedFromSubject && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                {t('message.escalatingFrom')}
              </p>
              <p className="text-xs text-amber-700 truncate">{escalatedFromSubject}</p>
            </div>
          </div>
        )}

        {/* recipientLevel selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('message.recipientLevel')}
          </label>
          <div className="grid grid-cols-3 gap-2" data-testid="level-selector">
            {LEVELS.map((level) => (
              <button
                key={level.key}
                type="button"
                onClick={() => setRecipientLevel(level.key)}
                data-testid={`level-${level.key}`}
                className={`px-3 py-2.5 rounded-xl border-2 text-center transition-all ${
                  recipientLevel === level.key ? level.selectedClass : level.idleClass
                }`}
              >
                <span className="block text-sm font-bold">
                  {t(level.labelKey)}
                </span>
                <span className="block text-xs mt-0.5 opacity-75">
                  {t(level.descKey)}
                </span>
              </button>
            ))}
          </div>
          {selectedLevel && (
            <p className="mt-2 text-xs text-slate-500">
              {t('message.levelHint', {
                level: t(selectedLevel.labelKey),
              })}
            </p>
          )}
        </div>

        {/* Subject + message */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('profile.subject')}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('profile.subjectPlaceholder')}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('profile.message')}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={t('profile.messagePlaceholder')}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            disabled={sending}
          >
            {t('profile.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !text.trim()}
            data-testid="send-button"
            className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('profile.sending')}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t('profile.send')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
