import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { useAuth } from '../shared/context/AuthContext';

const ChangePassword = () => {
  const { user, setUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError(t('changePasswordForced.mismatch'));
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t('changePasswordForced.tooShort'));
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) {
      setError(t('changePasswordForced.weakPassword'));
      return;
    }

    setSaving(true);
    try {
      await api.put('/user/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (user) setUser({ ...user, mustChangePassword: false });
      navigate('/teacher', { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('changePasswordForced.incorrect'));
      } else {
        setError(t('changePasswordForced.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-brand-600" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-slate-900 text-center mb-1">
            {t('changePasswordForced.title')}
          </h1>
          <p className="text-sm text-slate-500 text-center mb-6">
            {t('changePasswordForced.subtitle')}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-error-50 border border-error-100 text-sm text-error-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'currentPassword', label: t('changePasswordForced.current'), field: 'current' },
              { key: 'newPassword',     label: t('changePasswordForced.new'),     field: 'new' },
              { key: 'confirmPassword', label: t('changePasswordForced.confirm'), field: 'confirm' },
            ].map(({ key, label, field }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-800 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={show[field] ? 'text' : 'password'}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required
                    className="w-full h-10 px-3.5 pr-10 text-sm bg-surface border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                    autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1"
                    tabIndex={-1}
                    aria-label={show[field] ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {show[field] ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center h-11 px-4 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-md shadow-xs transition-colors"
            >
              {saving
                ? t('common.loading')
                : t('changePasswordForced.button')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
