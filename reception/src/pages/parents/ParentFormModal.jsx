import { useState } from 'react';
import { Eye, EyeOff, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ParentFormModal = ({ editingParent, formData, setFormData, teachers, groups, onSubmit, onClose }) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const filteredGroups = formData.teacherId
    ? groups.filter((g) => g.teacherId === formData.teacherId)
    : groups;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-modal-title"
        className="bg-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 id="parent-modal-title" className="text-2xl font-bold text-slate-900">
            {editingParent ? t('parentsPage.form.update') + ' ' + t('nav.parents') : t('parentsPage.add')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} aria-label={editingParent ? t('parentsPage.form.update') : t('parentsPage.add')} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('parentsPage.form.firstName')}</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('parentsPage.form.lastName')}</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('parentsPage.form.email')}</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('parentsPage.form.phone')}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('parentsPage.form.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!editingParent}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('parentsPage.form.teacher')}
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => {
                  const selectedTeacherId = e.target.value;
                  setFormData({ ...formData, teacherId: selectedTeacherId, groupId: '' });
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('parentsPage.form.teacher')} tanlang</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('parentsPage.form.group')} <span className="text-error-500">*</span>
              </label>
              <select
                required
                value={formData.groupId}
                onChange={(e) => {
                  const selectedGroupId = e.target.value;
                  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
                  setFormData({
                    ...formData,
                    groupId: selectedGroupId,
                    teacherId: selectedGroup?.teacherId || formData.teacherId,
                  });
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('parentsPage.form.group')} tanlang</option>
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Avval o&apos;qituvchi tanlang</option>
                )}
              </select>
              <p className="mt-1 text-xs text-slate-500">{t('parentsPage.form.groupRequired') || 'Guruh tanlash majburiy - bu bolaning faoliyat va ovqatlarini ko\'rish uchun kerak'}</p>
            </div>
          </div>

          {!editingParent && (
            <>
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{t('parentsPage.form.child')}</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('parentsPage.form.childFirstName')} <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.child.firstName}
                      onChange={(e) => setFormData({ ...formData, child: { ...formData.child, firstName: e.target.value } })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('parentsPage.form.childLastName')} <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.child.lastName}
                      onChange={(e) => setFormData({ ...formData, child: { ...formData.child, lastName: e.target.value } })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('parentsPage.form.childDob')} <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.child.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, child: { ...formData.child, dateOfBirth: e.target.value } })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('parentsPage.form.childGender')} <span className="text-error-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.child.gender}
                      onChange={(e) => setFormData({ ...formData, child: { ...formData.child, gender: e.target.value } })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="Male">Erkak</option>
                      <option value="Female">Ayol</option>
                      <option value="Other">Boshqa</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('parentsPage.form.childDisability')} <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.child.disabilityType}
                    onChange={(e) => setFormData({ ...formData, child: { ...formData.child, disabilityType: e.target.value } })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('parentsPage.form.childDiagnosis', { defaultValue: 'Tashxis' })}
                  </label>
                  <input
                    type="text"
                    value={formData.child.medicalDiagnosis || ''}
                    onChange={(e) => setFormData({ ...formData, child: { ...formData.child, medicalDiagnosis: e.target.value } })}
                    placeholder="F71 - ..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('parentsPage.form.childSpecialNeeds')}</label>
                  <textarea
                    value={formData.child.specialNeeds}
                    onChange={(e) => setFormData({ ...formData, child: { ...formData.child, specialNeeds: e.target.value } })}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingParent ? t('parentsPage.form.update') : t('parentsPage.form.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParentFormModal;
