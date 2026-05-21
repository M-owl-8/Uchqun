import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
      setError(t('changePasswordForced.mismatch', { defaultValue: 'New passwords do not match' }));
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t('changePasswordForced.tooShort', { defaultValue: 'Password must be at least 8 characters' }));
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) {
      setError(t('changePasswordForced.weakPassword', { defaultValue: 'Password must contain uppercase, lowercase, and a number' }));
      return;
    }

    setSaving(true);
    try {
      await api.put('/user/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      // Clear the flag locally so AppRoutes stops redirecting here.
      if (user) setUser({ ...user, mustChangePassword: false });
      navigate('/government', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.error?.detail ??
        err.response?.data?.error ??
        t('changePasswordForced.error', { defaultValue: 'Failed to change password' });
      // Show a friendlier message for incorrect current password
      if (err.response?.status === 401) {
        setError(t('changePasswordForced.incorrect', { defaultValue: 'Current password is incorrect' }));
      } else {
        setError(typeof msg === 'string' ? msg : t('changePasswordForced.error', { defaultValue: 'Failed to change password' }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-paper-line shadow-sm p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-brand-600" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-ink text-center mb-1">
            {t('changePasswordForced.title', { defaultValue: 'Change Password' })}
          </h1>
          <p className="text-sm text-ink-muted text-center mb-6">
            {t('changePasswordForced.subtitle', { defaultValue: 'You must set a new password before continuing.' })}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'currentPassword', label: t('changePasswordForced.current', { defaultValue: 'Current Password' }), field: 'current' },
              { key: 'newPassword',     label: t('changePasswordForced.new',     { defaultValue: 'New Password' }),     field: 'new' },
              { key: 'confirmPassword', label: t('changePasswordForced.confirm', { defaultValue: 'Confirm New Password' }), field: 'confirm' },
            ].map(({ key, label, field }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-ink mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={show[field] ? 'text' : 'password'}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required
                    className="w-full px-3 py-2 pr-10 border border-paper-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    tabIndex={-1}
                    aria-label={show[field] ? t('login.hidePassword', { defaultValue: 'Hide password' }) : t('login.showPassword', { defaultValue: 'Show password' })}
                  >
                    {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {saving
                ? t('common.loading', { defaultValue: 'Loading...' })
                : t('changePasswordForced.button', { defaultValue: 'Change Password' })}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
