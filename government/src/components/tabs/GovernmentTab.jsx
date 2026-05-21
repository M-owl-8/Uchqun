import { useState, useMemo } from 'react';
import { Eye, EyeOff, Plus, Globe, MapPin, Trash2, KeyRound, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Modal from '@shared/components/Modal';
import { useTranslation } from 'react-i18next';
import { CAPABILITY_KEYS } from '../../config/govCapabilities';

export default function GovernmentTab({
  governments,
  loadingGovernments,
  regions,
  loadingRegions,
  govType,
  isRepublic,
  govRegionId,
  onCreateGovernment,
  onDeleteGovernment,
  onResetPassword,
}) {
  const { t } = useTranslation();

  // ─── Create form state ────────────────────────────────────────────────────
  const [level, setLevel] = useState(isRepublic ? 'republic' : 'region');
  const [type, setType] = useState('main');
  const [regionId, setRegionId] = useState(govRegionId ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [grants, setGrants] = useState({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // ─── Reset-password modal state ───────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const credentialPreview = useMemo(() => {
    const slug = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!slug) return '';
    if (level === 'republic') return `${slug}@respublika`;
    const reg = regions.find((r) => r.id === regionId);
    return reg ? `${slug}@${reg.code.toLowerCase()}` : '';
  }, [firstName, level, regionId, regions]);

  const regionName = (id) => regions.find((r) => r.id === id)?.name ?? null;

  const toggleGrant = (key) =>
    setGrants((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Create form submit ───────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    const fn = firstName.trim();
    const ln = lastName.trim();
    const pw = password.trim();
    if (!fn || !ln || !pw) {
      setCreateError(t('provision.errors.allRequired'));
      return;
    }
    if (level === 'region' && !regionId) {
      setCreateError(t('provision.errors.selectRegion'));
      return;
    }
    if (!PASSWORD_RE.test(pw)) {
      setCreateError(t('provision.errors.passwordStrength'));
      return;
    }
    try {
      setCreating(true);
      await onCreateGovernment({
        firstName: fn,
        lastName: ln,
        password: pw,
        govLevel: level,
        govType: type,
        govRegionId: level === 'region' ? regionId : undefined,
        govAccessGrants: type === 'secondary' ? grants : undefined,
      });
      setFirstName('');
      setLastName('');
      setPassword('');
      setGrants({});
      setType('main');
      if (isRepublic) setLevel('republic');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'PROVISION_CREDENTIAL_TAKEN') {
        setCreateError(t('provision.errors.credentialTaken'));
      } else if (code === 'REPUBLIC_MAIN_EXISTS') {
        setCreateError(t('provision.errors.republicMainExists'));
      } else {
        setCreateError(
          err.response?.data?.error?.detail ?? t('provision.errors.createFailed')
        );
      }
    } finally {
      setCreating(false);
    }
  };

  // ─── Reset-password modal submit ──────────────────────────────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    const pw = newPassword.trim();
    if (!PASSWORD_RE.test(pw)) {
      setResetError(t('provision.errors.passwordStrength'));
      return;
    }
    try {
      setResetting(true);
      await onResetPassword(resetTarget.id, pw);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setResetError(
        err.response?.data?.error?.detail ??
          t('provision.errors.resetFailed', { defaultValue: 'Password reset failed' })
      );
    } finally {
      setResetting(false);
    }
  };

  const closeReset = () => {
    setResetTarget(null);
    setNewPassword('');
    setResetError('');
    setShowNewPwd(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Account list ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold text-inkGreen-900 mb-1">
          {t('provision.title')} ({governments.length})
        </h2>
        <p className="text-sm text-gray-500">{t('provision.subtitle')}</p>
      </div>

      {loadingGovernments ? (
        <Card className="p-8">
          <div className="flex justify-center min-h-[80px] items-center">
            <LoadingSpinner size="sm" />
          </div>
        </Card>
      ) : governments.length === 0 ? (
        <Card className="p-8">
          <p className="text-sm text-gray-600 text-center py-8">
            {t('provision.list.empty')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {governments.map((gov) => {
            const isRepublicAccount = gov.govLevel === 'republic';
            const isMainAccount = gov.govType === 'main';
            const rName = gov.govRegionId ? regionName(gov.govRegionId) : null;
            const activeGrants = gov.govAccessGrants
              ? Object.keys(gov.govAccessGrants).filter((k) => gov.govAccessGrants[k])
              : [];

            return (
              <div
                key={gov.id}
                className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                    {gov.firstName?.charAt(0)}
                    {gov.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {gov.firstName} {gov.lastName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">{gov.email}</p>

                    {/* Level + type + mustChangePassword badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isRepublicAccount
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isRepublicAccount ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        {isRepublicAccount
                          ? t('provision.list.republic')
                          : (rName || t('provision.list.region'))}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isMainAccount
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {isMainAccount
                          ? t('provision.list.main')
                          : t('provision.list.secondary')}
                      </span>
                      {gov.mustChangePassword && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <AlertCircle className="w-3 h-3" />
                          {t('provision.list.mustChangePassword')}
                        </span>
                      )}
                    </div>

                    {/* Grants for secondary accounts */}
                    {!isMainAccount && (
                      <div className="mt-2">
                        {activeGrants.length === 0 ? (
                          <p className="text-xs text-gray-400">{t('provision.list.noGrants')}</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {activeGrants.map((k) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {t(`provision.grants.${k}`, { defaultValue: k })}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions — main viewers only */}
                {govType === 'main' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setResetTarget(gov);
                        setNewPassword('');
                        setResetError('');
                        setShowNewPwd(false);
                      }}
                    >
                      <KeyRound className="w-4 h-4 mr-1" />
                      {t('provision.actions.resetPassword')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDeleteGovernment(gov.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('provision.actions.delete')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create form (main accounts only) ─────────────────────────────── */}
      {govType === 'main' && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-inkGreen-900 mb-4">
            {t('provision.createTitle')}
          </h3>
          <Card className="p-6">
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Level + type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('provision.form.level')}
                  </label>
                  <select
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value);
                      if (e.target.value === 'republic') setRegionId('');
                      else setRegionId(govRegionId ?? '');
                    }}
                    disabled={!isRepublic}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {isRepublic && (
                      <option value="republic">{t('provision.form.levelRepublic')}</option>
                    )}
                    <option value="region">{t('provision.form.levelRegion')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('provision.form.type')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      if (e.target.value !== 'secondary') setGrants({});
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="main">{t('provision.form.typeMain')}</option>
                    <option value="secondary">{t('provision.form.typeSecondary')}</option>
                  </select>
                </div>
              </div>

              {/* Region dropdown (region-level only) */}
              {level === 'region' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('provision.form.region')}
                  </label>
                  {loadingRegions ? (
                    <div className="text-sm text-gray-400 py-2">
                      {t('provision.form.loadingRegions', { defaultValue: 'Loading regions…' })}
                    </div>
                  ) : (
                    <select
                      value={regionId}
                      onChange={(e) => setRegionId(e.target.value)}
                      disabled={!isRepublic}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {isRepublic && !regionId && (
                        <option value="">
                          {t('provision.form.selectRegion', { defaultValue: 'Select a region' })}
                        </option>
                      )}
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('provision.form.firstName')}
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('provision.form.firstName')}
                />
                <Input
                  label={t('provision.form.lastName')}
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('provision.form.lastName')}
                />
              </div>

              {/* Credential preview */}
              {credentialPreview && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">
                    {t('provision.form.credentialPreview')}
                  </p>
                  <p className="font-mono text-sm font-semibold text-inkGreen-800">
                    {credentialPreview}
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('provision.form.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {t('government.validation.passwordStrengthHint')}
                </p>
              </div>

              {/* Grant toggles (secondary only) */}
              {type === 'secondary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('provision.form.grants')}
                  </label>
                  <p className="text-xs text-gray-400 mb-3">{t('provision.form.grantsHint')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CAPABILITY_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={grants[key] === true}
                          onChange={() => toggleGrant(key)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {t(`provision.grants.${key}`, { defaultValue: key })}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}

              <Button type="submit" variant="primary" loading={creating} className="w-full">
                <Plus className="w-5 h-5 mr-1" />
                {t('provision.form.create')}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Reset-password modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!resetTarget}
        onClose={closeReset}
        title={
          resetTarget
            ? `${t('provision.actions.resetPasswordTitle')} — ${resetTarget.firstName} ${resetTarget.lastName}`
            : ''
        }
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeReset}
              disabled={resetting}
            >
              {t('government.cancel')}
            </Button>
            <Button
              type="submit"
              form="reset-pwd-form"
              variant="primary"
              className="flex-1"
              loading={resetting}
            >
              {t('provision.actions.resetSubmit')}
            </Button>
          </div>
        }
      >
        <form id="reset-pwd-form" onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('provision.actions.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showNewPwd ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="••••••••"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPwd((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
              >
                {showNewPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {t('government.validation.passwordStrengthHint')}
            </p>
          </div>
          {resetError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {resetError}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
