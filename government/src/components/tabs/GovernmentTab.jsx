import { useState } from 'react';
import { Lock, Eye, EyeOff, Plus } from 'lucide-react';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Modal from '@shared/components/Modal';
import { useTranslation } from 'react-i18next';

export default function GovernmentTab({
  governments, loadingGovernments, govLoading,
  govFirstName, govLastName, govEmail, govPassword,
  setGovFirstName, setGovLastName, setGovEmail, setGovPassword,
  onCreateGovernment,
  editingGovernment, editGovFirstName, editGovLastName, editGovEmail, editGovPassword, editGovSaving,
  setEditGovFirstName, setEditGovLastName, setEditGovEmail, setEditGovPassword,
  onStartEditGovernment, onUpdateGovernment, onDeleteGovernment, onCloseEditGov,
  showPasswords, setShowPasswords,
}) {
  const { t } = useTranslation();
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-inkGreen-900 mb-1">
          {t('government.createGovernmentTitle', { defaultValue: 'Davlat Foydalanuvchisini Yaratish' })}
        </h2>
        <p className="text-sm text-gray-500">{t('government.createGovernmentSubtitle', { defaultValue: 'Government panel uchun yangi foydalanuvchi yarating' })}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={onCreateGovernment} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('government.form.firstName')}
              required
              value={govFirstName}
              onChange={(e) => setGovFirstName(e.target.value)}
              placeholder={t('government.form.firstName')}
            />
            <Input
              label={t('government.form.lastName')}
              required
              value={govLastName}
              onChange={(e) => setGovLastName(e.target.value)}
              placeholder={t('government.form.lastName')}
            />
          </div>
          <Input
            label={t('government.form.email')}
            type="email"
            required
            value={govEmail}
            onChange={(e) => setGovEmail(e.target.value)}
            placeholder="email@example.com"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              {t('government.form.password')}
            </label>
            <div className="relative">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                required
                value={govPassword}
                onChange={(e) => setGovPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="••••••••"
                minLength={8}
              />
              <button type="button" onClick={() => setShowCreatePassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                {showCreatePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('government.form.passwordMinLength', { defaultValue: "Parol kamida 8 belgidan iborat bo'lishi kerak" })}</p>
          </div>
          <Button type="submit" variant="primary" loading={govLoading} className="w-full">
            <Plus className="w-5 h-5 mr-1" />
            {t('government.createGovernment', { defaultValue: 'Government Foydalanuvchisini Yaratish' })}
          </Button>
        </form>
      </Card>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {t('government.governmentList', { defaultValue: "Qo'shilgan Government Foydalanuvchilar" })} ({governments.length})
        </h3>
        {loadingGovernments ? (
          <Card className="p-8"><div className="flex items-center justify-center min-h-[120px]"><LoadingSpinner size="sm" /></div></Card>
        ) : governments.length === 0 ? (
          <Card className="p-8"><p className="text-sm text-gray-600 text-center py-8">{t('government.noGovernments', { defaultValue: "Hozircha government foydalanuvchilar yo'q" })}</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {governments.map((gov) => (
              <div key={gov.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center flex-shrink-0">
                    {gov.firstName?.charAt(0)}{gov.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{gov.firstName} {gov.lastName}</p>
                    <p className="text-sm text-gray-600">{gov.email}</p>
                    <p className="text-xs text-gray-500">{gov.createdAt ? new Date(gov.createdAt).toLocaleDateString() : '—'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${gov.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {gov.isActive ? t('government.active', { defaultValue: 'Faol' }) : t('government.inactive', { defaultValue: 'Nofaol' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" size="sm" onClick={() => onStartEditGovernment(gov)}>
                    {t('government.form.update')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDeleteGovernment(gov.id)}>
                    {t('government.delete', { defaultValue: "O'chirish" })}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editingGovernment}
        onClose={onCloseEditGov}
        title={editingGovernment ? `${t('government.editTitle')} — ${editingGovernment.email}` : ''}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onCloseEditGov} disabled={editGovSaving}>
              {t('government.form.cancel')}
            </Button>
            <Button type="submit" form="edit-gov-form" variant="primary" className="flex-1" loading={editGovSaving}>
              {t('government.form.save')}
            </Button>
          </div>
        }
      >
        <form id="edit-gov-form" onSubmit={onUpdateGovernment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('government.form.firstName')}
              required
              value={editGovFirstName}
              onChange={(e) => setEditGovFirstName(e.target.value)}
            />
            <Input
              label={t('government.form.lastName')}
              required
              value={editGovLastName}
              onChange={(e) => setEditGovLastName(e.target.value)}
            />
          </div>
          <Input
            label={t('government.form.email')}
            type="email"
            required
            value={editGovEmail}
            onChange={(e) => setEditGovEmail(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.newPassword', { defaultValue: 'Yangi parol (ixtiyoriy)' })}</label>
            <div className="relative">
              <input
                type={showPasswords.edit ? 'text' : 'password'}
                value={editGovPassword}
                onChange={(e) => setEditGovPassword(e.target.value)}
                placeholder={t('government.form.passwordOptional', { defaultValue: "Parolni o'zgartirmasangiz bo'sh qoldiring" })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
              />
              <button type="button" onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
