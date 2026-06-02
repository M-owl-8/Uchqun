import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ExternalLink, Building2 } from 'lucide-react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Modal from '@shared/components/Modal';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const LOCAL_PART_RE = /^[a-z0-9][a-z0-9._-]{0,30}[a-z0-9]$|^[a-z0-9]$/;

export default function AdminsTab({
  admins, loadingAdmins,
  schools, loadingSchools,
  loading,
  onSubmit,
  editingAdmin, editFirstName, editLastName, editPhone, editPassword, editSaving,
  setEditFirstName, setEditLastName, setEditPhone, setEditPassword,
  onStartEdit, onUpdateAdmin, onDeleteAdmin, onCloseEdit,
  showPasswords, setShowPasswords,
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [strengthError, setStrengthError] = useState('');

  const selectedSchool = useMemo(
    () => schools?.find((s) => s.id === schoolId) ?? null,
    [schools, schoolId]
  );

  const emailPreview = useMemo(() => {
    const clean = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!clean || !selectedSchool?.slug) return '';
    return `${clean}@${selectedSchool.slug}.uz`;
  }, [localPart, selectedSchool]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!schoolId) {
      setStrengthError(t('government.validation.schoolRequired', { defaultValue: 'Muassasani tanlang' }));
      return;
    }
    if (!LOCAL_PART_RE.test(localPart.toLowerCase())) {
      setStrengthError(t('government.validation.localPartInvalid', { defaultValue: 'Email qismi: 1-32 belgi, kichik harf/raqam/nuqta/chiziq' }));
      return;
    }
    if (!PASSWORD_RE.test(password)) {
      setStrengthError(t('government.validation.passwordStrength', { defaultValue: 'Parolda katta harf, kichik harf va raqam bo\'lishi kerak (min 8 belgi)' }));
      return;
    }
    if (password !== confirm) {
      setStrengthError(t('government.validation.passwordMismatch', { defaultValue: 'Parollar mos kelmadi' }));
      return;
    }
    setStrengthError('');
    onSubmit({ firstName, lastName, localPart: localPart.toLowerCase(), schoolId, password }, () => {
      setFirstName(''); setLastName(''); setLocalPart(''); setSchoolId(''); setPassword(''); setConfirm('');
    });
  };

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-inkGreen-900 mb-1">
          {t('government.createTitle')}
        </h2>
        <p className="text-sm text-gray-500">{t('government.createSubtitle')}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('government.form.firstName')}
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('government.form.firstName')}
              disabled={loading}
            />
            <Input
              label={t('government.form.lastName')}
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('government.form.lastName')}
              disabled={loading}
            />
          </div>

          {/* School selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-400" />
              {t('government.form.school', { defaultValue: 'Muassasa' })} *
            </label>
            {loadingSchools ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <LoadingSpinner size="sm" /> {t('government.status.loadingSchools', { defaultValue: 'Muassasalar yuklanmoqda...' })}
              </div>
            ) : (
              <select
                required
                value={schoolId}
                onChange={(e) => { setSchoolId(e.target.value); setLocalPart(''); }}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
              >
                <option value="">{t('government.form.selectSchool', { defaultValue: 'Muassasani tanlang...' })}</option>
                {(schools ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.slug ? `(@${s.slug}.uz)` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Split email input: localPart + @school.slug.uz */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('government.form.email')} *
            </label>
            <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 ${!schoolId ? 'opacity-60' : ''}`}>
              <input
                type="text"
                required
                disabled={loading || !schoolId}
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder={t('government.form.localPart', { defaultValue: 'direktor' })}
                className="flex-1 px-4 py-3 border-0 outline-none bg-transparent disabled:bg-gray-50"
              />
              <span className="px-3 py-3 bg-gray-100 text-gray-600 text-sm border-l border-gray-200 select-none whitespace-nowrap">
                @{selectedSchool?.slug ? `${selectedSchool.slug}.uz` : t('government.form.schoolDomainPlaceholder', { defaultValue: 'muassasa.uz' })}
              </span>
            </div>
            {!schoolId && (
              <p className="mt-1 text-xs text-gray-400">
                {t('government.form.selectSchoolFirst', { defaultValue: 'Avval muassasani tanlang' })}
              </p>
            )}
            {emailPreview && (
              <div className="mt-2 flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                <span className="text-xs text-brand-700">
                  {t('government.form.credentialPreviewAdmin', { defaultValue: 'Login:' })} <span className="font-mono font-semibold">{emailPreview}</span>
                </span>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              {t('government.form.password')}
            </label>
            <div className="relative">
              <input
                type={showCreate ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setStrengthError(''); }}
                placeholder={t('government.form.password')}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowCreate(!showCreate)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                {showCreate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('government.validation.passwordStrengthHint', { defaultValue: 'Kamida 8 belgi, katta harf, kichik harf, raqam' })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              {t('government.form.confirmPassword', { defaultValue: 'Parolni tasdiqlang' })}
            </label>
            <input
              type={showCreate ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setStrengthError(''); }}
              placeholder={t('government.form.confirmPassword', { defaultValue: 'Parolni tasdiqlang' })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loading}
            />
            {strengthError && <p className="mt-1 text-xs text-red-600">{strengthError}</p>}
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full">
            {t('government.form.create')}
          </Button>
        </form>
      </Card>

      {/* Existing admins list */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t('government.listTitle')}</h3>
          {loadingAdmins && <div className="text-sm text-gray-500">{t('government.status.loadingAdmins')}</div>}
        </div>
        {loadingAdmins ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <LoadingSpinner size="sm" />
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t('government.noAdmins', { defaultValue: 'Adminlar topilmadi' })}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {admins.map((adm) => (
              <div key={adm.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
                    {adm.firstName?.charAt(0)}{adm.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{adm.firstName} {adm.lastName}</p>
                    <p className="text-sm text-gray-600 font-mono">{adm.email}</p>
                    <p className="text-xs text-gray-500">{adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '—'}</p>
                    {adm.phone && <p className="text-xs text-gray-500">{adm.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/government/admin/${adm.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 border border-brand-200 hover:bg-brand-50 rounded-md px-2.5 py-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('adminDetails.view', { defaultValue: "Ko'rish" })}
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => onStartEdit(adm)}>
                    {t('government.form.update')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDeleteAdmin(adm.id)}>
                    {t('government.delete', { defaultValue: "O'chirish" })}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit admin modal — email is read-only (immutable post-creation) */}
      <Modal
        isOpen={!!editingAdmin}
        onClose={onCloseEdit}
        title={editingAdmin ? `${t('government.editTitle')} — ${editingAdmin.email}` : ''}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onCloseEdit} disabled={editSaving}>
              {t('government.form.cancel')}
            </Button>
            <Button type="submit" form="edit-admin-form" variant="primary" className="flex-1" loading={editSaving}>
              {t('government.form.save')}
            </Button>
          </div>
        }
      >
        <form id="edit-admin-form" onSubmit={onUpdateAdmin} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('government.form.firstName')}
              required
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
            />
            <Input
              label={t('government.form.lastName')}
              required
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
            />
          </div>
          {/* Email: read-only — immutable post-creation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('government.form.email')}
            </label>
            <input
              type="email"
              value={editingAdmin?.email ?? ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-sm"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {t('settings.emailCannotChange', { defaultValue: "Email o'zgartirib bo'lmaydi" })}
            </p>
          </div>
          <Input
            label={t('government.form.phone')}
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.newPassword', { defaultValue: 'Yangi parol (ixtiyoriy)' })}</label>
            <div className="relative">
              <input
                type={showPasswords.edit ? 'text' : 'password'}
                autoComplete="new-password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder={t('government.form.passwordChange', { defaultValue: "Parolni o'zgartirish uchun kiriting" })}
                className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
