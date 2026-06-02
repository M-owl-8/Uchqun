import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Wizard from '../../components/Wizard';
import ParentStep from './steps/ParentStep';
import ChildStep from './steps/ChildStep';
import GroupStep from './steps/GroupStep';
import api from '../../services/api';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useFormPersistence from '@shared/hooks/useFormPersistence';

const STEPS = ["Ota-ona ma'lumotlari", "Bola ma'lumotlari", 'Guruh tayinlash'];

const defaultParent = {
  firstName: '', lastName: '', localPart: '', phone: '', password: '',
  address: '', passport: '', nativeLanguage: '',
};
const defaultChild = {
  firstName: '', lastName: '', dateOfBirth: '', gender: 'Male',
  disabilityType: '', diagnosisLevel: '', specialNeeds: '',
};
const defaultGroup = { groupId: '' };

export default function ParentWizardPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();

  const DRAFT_KEY = `wizard:parent:${user?.id || 'anon'}:draft`;
  const { restore, save, clear } = useFormPersistence(DRAFT_KEY, { storage: 'localStorage' });

  const [step, setStep] = useState(0);
  const [parentData, setParentData] = useState(defaultParent);
  const [childData, setChildData] = useState(defaultChild);
  const [groupData, setGroupData] = useState(defaultGroup);
  const [loading, setLoading] = useState(false);
  const [draftBanner, setDraftBanner] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');

  useEffect(() => {
    api.get('/reception/school-info').then(res => {
      const slug = res.data?.data?.slug;
      if (slug) setSchoolSlug(slug);
    }).catch(() => {});
  }, []);

  // On mount: check for persisted draft — show inline banner
  useEffect(() => {
    const draft = restore();
    if (draft) setDraftBanner(draft);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage on every data change (throttled by hook)
  useEffect(() => {
    const hasData = parentData.firstName || parentData.lastName || parentData.email ||
                    childData.firstName || childData.lastName;
    if (hasData) save({ parentData, childData, groupData, step });
  }, [parentData, childData, groupData, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before unload when wizard has data
  useEffect(() => {
    const hasDirtyData = parentData.firstName || parentData.email || childData.firstName;
    if (!hasDirtyData) return;
    const handler = (e) => { e.preventDefault(); return (e.returnValue = ''); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [parentData.firstName, parentData.email, childData.firstName]);

  const handleResumeDraft = () => {
    if (!draftBanner) return;
    if (draftBanner.parentData) setParentData(draftBanner.parentData);
    if (draftBanner.childData) setChildData(draftBanner.childData);
    if (draftBanner.groupData) setGroupData(draftBanner.groupData);
    if (draftBanner.step !== undefined) setStep(draftBanner.step);
    setDraftBanner(null);
  };

  const handleDiscardDraft = () => {
    clear();
    setDraftBanner(null);
  };

  const saveDraft = () => {
    save({ parentData, childData, groupData, step });
    success("Qoralama saqlandi");
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    if (!groupData.groupId) {
      showError("Guruh tanlash majburiy");
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      // Parent fields
      Object.entries(parentData).forEach(([k, v]) => { if (v) payload.append(k, v); });
      // Group
      if (groupData.groupId) payload.append('groupId', groupData.groupId);
      // Child fields
      if (childData.firstName && childData.lastName) {
        Object.entries(childData).forEach(([k, v]) => {
          if (v) payload.append(`child[${k}]`, v);
        });
      }
      await api.post('/reception/parents', payload);
      clear();
      success("Ota-ona muvaffaqiyatli qo'shildi");
      navigate('/reception/wizard/complete', {
        state: { email: parentData.email, password: parentData.password },
      });
    } catch (err) {
      showError(err.response?.data?.error || "Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Draft restore banner — replaces window.confirm (RE-8) */}
      {draftBanner && (
        <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-4 text-[13.5px] text-amber-900">
          <div className="flex-1">
            {t('parentsPage.wizard.draftRestorePrompt', { defaultValue: "Saqlangan qoralama topildi. Davom etishni xohlaysizmi?" })}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="h-8 px-3 rounded-md text-[12.5px] font-medium bg-amber-700 text-white hover:bg-amber-800 transition-colors"
            >
              {t('parentsPage.wizard.draftResume', { defaultValue: "Davom etish" })}
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="h-8 px-3 rounded-md text-[12.5px] font-medium border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
            >
              {t('parentsPage.wizard.draftDiscard', { defaultValue: "Bekor qilish" })}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="h1-tab text-[26px] font-semibold tracking-tight text-slate-900">
          {"Yangi ota-ona qo'shish"}
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-1.5">
          {"3 qadamli sehrgar orqali ota-ona, bola va guruhni birga ro'yxatdan o'tkazing."}
        </p>
      </div>

      <Wizard
        steps={STEPS}
        currentStep={step}
        onBack={handleBack}
        onNext={handleNext}
        onSaveDraft={saveDraft}
        onComplete={handleComplete}
        isFirst={step === 0}
        isLast={step === STEPS.length - 1}
        loading={loading}
        title="Yangi ota-ona qo'shish"
      >
        {step === 0 && <ParentStep data={parentData} onChange={setParentData} schoolSlug={schoolSlug} />}
        {step === 1 && <ChildStep data={childData} onChange={setChildData} />}
        {step === 2 && (
          <GroupStep
            data={groupData}
            onChange={setGroupData}
            parentData={parentData}
            childData={childData}
          />
        )}
      </Wizard>
    </div>
  );
}
