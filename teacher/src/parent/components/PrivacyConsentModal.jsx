// G4 of BETA-LAUNCH-PLAN — privacy consent modal.
//
// Renders an undismissible modal on first parent login. Two disclosures
// covered (see docs/PRIVACY_POSTURE.md):
//   1. Group-wide media visibility (PL-001 / C-02)
//   2. AI-generated UI translations may contain errors (CP-019 / PL-009)
//
// State machine: fetch /parent/privacy-consent on mount. If required, show
// the modal. Accept → POST /parent/privacy-consent → close. Decline → log
// out (handled by the LogoutModal flow upstream).
//
// The modal blocks all interaction underneath. Escape and overlay-click are
// intentionally disabled — consent must be explicit.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Image as ImageIcon, Languages, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PrivacyConsentModal = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [acceptedMedia, setAcceptedMedia] = useState(false);
  const [acceptedI18n, setAcceptedI18n] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'parent') return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/parent/privacy-consent');
        if (!alive) return;
        if (res.data?.data?.required) setShow(true);
      } catch {
        // Fail open — don't block login on an API error. The next page load retries.
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const canAccept = acceptedMedia && acceptedI18n && !submitting;

  const handleAccept = async () => {
    if (!canAccept) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/parent/privacy-consent');
      setShow(false);
    } catch (err) {
      const code = err?.response?.data?.error?.code || 'PRIVACY_CONSENT_WRITE_FAILED';
      setError(t(`error.${code}`, { defaultValue: t('privacyConsent.errorGeneric') }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-p-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      <div className="bg-p-paper rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-lg bg-p-brand-50 grid place-items-center">
              <ShieldCheck className="w-5 h-5 text-p-brand-600" />
            </span>
            <h2 id="privacy-consent-title" className="font-serif text-[20px] font-semibold text-p-ink">
              {t('privacyConsent.title')}
            </h2>
          </div>

          <p className="text-[14px] text-p-sepia-600 leading-relaxed mb-6">
            {t('privacyConsent.intro')}
          </p>

          <section className="border border-p-sepia-200 rounded-xl p-4 mb-3">
            <div className="flex items-start gap-3 mb-2">
              <ImageIcon className="w-4 h-4 text-p-brand-500 mt-0.5 shrink-0" />
              <h3 className="font-semibold text-[14px] text-p-ink">
                {t('privacyConsent.mediaTitle')}
              </h3>
            </div>
            <p className="text-[13px] text-p-sepia-700 leading-relaxed mb-3">
              {t('privacyConsent.mediaBody')}
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedMedia}
                onChange={(e) => setAcceptedMedia(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-p-brand-600"
              />
              <span className="text-[13px] text-p-ink font-medium">
                {t('privacyConsent.mediaAck')}
              </span>
            </label>
          </section>

          <section className="border border-p-sepia-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3 mb-2">
              <Languages className="w-4 h-4 text-p-brand-500 mt-0.5 shrink-0" />
              <h3 className="font-semibold text-[14px] text-p-ink">
                {t('privacyConsent.i18nTitle')}
              </h3>
            </div>
            <p className="text-[13px] text-p-sepia-700 leading-relaxed mb-3">
              {t('privacyConsent.i18nBody')}
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedI18n}
                onChange={(e) => setAcceptedI18n(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-p-brand-600"
              />
              <span className="text-[13px] text-p-ink font-medium">
                {t('privacyConsent.i18nAck')}
              </span>
            </label>
          </section>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-error-700 text-[13px]">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={!canAccept}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-p-brand-600 text-white font-medium hover:bg-p-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('privacyConsent.accept')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="sm:flex-none inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-p-sepia-50 text-p-sepia-700 border border-p-sepia-200 hover:bg-p-sepia-100 text-[13px] font-medium"
            >
              {t('privacyConsent.decline')}
            </button>
          </div>

          <p className="text-[11px] text-p-sepia-500 mt-4 leading-relaxed">
            {t('privacyConsent.footnote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsentModal;
