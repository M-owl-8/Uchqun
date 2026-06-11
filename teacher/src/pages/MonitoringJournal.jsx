// TP-MONITORING-SEPARATION — Monitoring hub for teachers.
//
// Three tabs:
//   - Emotsional  — daily emotional state (9 criteria, bulk-fill grid)
//   - Kunlik      — daily clinical monitoring (27 items: hygiene/health/GI)
//   - Haftalik    — weekly monitoring (18 items: emotional + environment)
//
// Daily and Weekly tabs were extracted from IrrShell so monitoring is a
// dedicated daily-ops surface, decoupled from the IRR strategic document.
// All three call the same backend endpoints they did before.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, Edit2, FileX, Plus, Save, Trash2, X, Baby,
  Smile, ClipboardCheck, CalendarDays,
} from 'lucide-react';
import Card from '../shared/components/Card';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import api from '../shared/services/api';
import { useTranslation } from 'react-i18next';
import * as cache from '../../../shared/utils/cache';
import { todayLocal } from '@shared/utils/formatDate';
import MonitoringBulkFill from '../components/MonitoringBulkFill';
import DailyMonitoringTab from './monitoring/DailyMonitoringTab';
import WeeklyMonitoringTab from './monitoring/WeeklyMonitoringTab';

const EMOTIONAL_KEYS = [
  'stable', 'positiveEmotions', 'noAnxiety', 'noHostility', 'calmResponse',
  'showsEmpathy', 'quickRecovery', 'stableMood', 'trustingRelationship',
];

const TABS = [
  { key: 'emotional', labelKey: 'monitoring.tabEmotional', defaultLabel: 'Emotsional', icon: Smile },
  { key: 'daily',     labelKey: 'monitoring.tabDaily',     defaultLabel: 'Kundalik',   icon: ClipboardCheck },
  { key: 'weekly',    labelKey: 'monitoring.tabWeekly',    defaultLabel: 'Haftalik',   icon: CalendarDays },
];

const MonitoringJournal = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params namespaced (`mtab`, `mchildId`) so they don't collide with
  // the parent Reja tab's `?tab=` param when this component is rendered as
  // a Reja sub-tab.
  const activeTab = searchParams.get('mtab') || 'emotional';
  const initialChildId = searchParams.get('mchildId') || '';

  // ── Shared state: children list ──────────────────────────────────────────
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(initialChildId);

  // ── Emotional tab state ──────────────────────────────────────────────────
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [formData, setFormData] = useState({
    childId: '',
    date: todayLocal(),
    emotionalState: EMOTIONAL_KEYS.reduce((a, k) => ({ ...a, [k]: false }), {}),
    notes: '',
    teacherSignature: '',
  });
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showBulkFill, setShowBulkFill] = useState(false);

  const setActiveTab = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set('mtab', key);
    setSearchParams(next);
  };

  const setActiveChild = (id) => {
    setSelectedChildId(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set('mchildId', id); else next.delete('mchildId');
    setSearchParams(next);
  };

  const buildChildrenFromParents = (parentsList) => {
    const all = [];
    parentsList.forEach(parent => {
      if (Array.isArray(parent.children)) {
        parent.children.forEach(child => {
          all.push({ ...child, parentName: `${parent.firstName} ${parent.lastName}` });
        });
      }
    });
    return all;
  };

  const loadParents = useCallback(async (signal) => {
    const cached = cache.get('teacher:parents');
    if (cached) {
      setChildren(buildChildrenFromParents(cached));
      api.get('/teacher/parents', { signal })
        .then(res => {
          const list = Array.isArray(res.data.parents) ? res.data.parents : [];
          cache.set('teacher:parents', list);
          setChildren(buildChildrenFromParents(list));
        })
        .catch(() => {});
      return;
    }
    try {
      const response = await api.get('/teacher/parents', { signal });
      const parentsList = Array.isArray(response.data.parents) ? response.data.parents : [];
      cache.set('teacher:parents', parentsList);
      setChildren(buildChildrenFromParents(parentsList));
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(t('monitoring.toastLoadParentsError'));
    }
  }, [showError, t]);

  const loadMonitoringRecords = useCallback(async (bust = false, signal) => {
    const CACHE_KEY = 'teacher:monitoring';
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      setMonitoringRecords(cached);
      setLoading(false);
      api.get('/teacher/emotional-monitoring', { signal })
        .then(res => {
          const records = Array.isArray(res.data.data) ? res.data.data : [];
          cache.set(CACHE_KEY, records);
          setMonitoringRecords(records);
        })
        .catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/teacher/emotional-monitoring', { signal });
      const records = Array.isArray(response.data.data) ? response.data.data : [];
      cache.set(CACHE_KEY, records);
      setMonitoringRecords(records);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(t('monitoring.toastLoadError'));
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadMonitoringRecords(false, controller.signal);
    loadParents(controller.signal);
    return () => controller.abort();
  }, [loadMonitoringRecords, loadParents]);

  // Default child selection: first available
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const handleOpenModal = (child = null, record = null) => {
    if (record) {
      setEditingRecord(record);
      setSelectedChild(child || children.find(c => c.id === record.childId));
      setFormData({
        childId: record.childId,
        date: record.date,
        emotionalState: record.emotionalState || EMOTIONAL_KEYS.reduce((a, k) => ({ ...a, [k]: false }), {}),
        notes: record.notes || '',
        teacherSignature: record.teacherSignature || ((user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : ''),
      });
    } else {
      setEditingRecord(null);
      setSelectedChild(child);
      setFormData({
        childId: child?.id || '',
        date: todayLocal(),
        emotionalState: EMOTIONAL_KEYS.reduce((a, k) => ({ ...a, [k]: false }), {}),
        notes: '',
        teacherSignature: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setSelectedChild(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.childId || !formData.date) {
      showError(t('monitoring.selectChildError'));
      return;
    }
    try {
      if (editingRecord) {
        await api.put(`/teacher/emotional-monitoring/${editingRecord.id}`, formData);
        success(t('monitoring.toastUpdate'));
      } else {
        await api.post('/teacher/emotional-monitoring', formData);
        success(t('monitoring.toastCreate'));
      }
      handleCloseModal();
      cache.invalidate('teacher:monitoring');
      loadMonitoringRecords(true);
    } catch (error) {
      showError(error.response?.data?.error || t('monitoring.toastError'));
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: t('monitoring.confirmDelete'),
      warning: t('monitoring.confirmDeleteWarning'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/teacher/emotional-monitoring/${id}`);
          success(t('monitoring.toastDelete'));
          cache.invalidate('teacher:monitoring');
          loadMonitoringRecords(true);
        } catch {
          showError(t('monitoring.toastError'));
        }
      },
    });
  };

  const toggleEmotionalState = (key) => {
    setFormData(prev => ({
      ...prev,
      emotionalState: { ...prev.emotionalState, [key]: !prev.emotionalState[key] },
    }));
  };

  const getRecordForChild = (childId, date) =>
    monitoringRecords.find(r => r.childId === childId && r.date === date);

  // ── Child selector (for daily / weekly tabs) ─────────────────────────────
  const ChildSelector = () => (
    <div className="rounded-xl border border-slate-200 bg-surface p-4 flex flex-wrap items-center gap-3">
      <span className="text-[13px] font-medium text-slate-700">
        {t('monitoring.child', { defaultValue: 'Bola' })}:
      </span>
      <select
        value={selectedChildId}
        onChange={(e) => setActiveChild(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-md text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent min-w-[200px]"
      >
        <option value="">{t('monitoring.selectChild', { defaultValue: 'Tanlang…' })}</option>
        {children.map(c => (
          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
        ))}
      </select>
    </div>
  );

  if (loading && activeTab === 'emotional') {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">
            {t('monitoring.title', { defaultValue: 'Kuzatuv jurnali' })}
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {t('monitoring.subtitle', { defaultValue: 'Bolalarning kunlik va haftalik holatini kuzatish' })}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => {
            const isActive = tab.key === activeTab;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
              </button>
            );
          })}
        </div>

        {/* PL-017 (Q8): physical journals coexist with the platform — small
            regulatory note at the ИРР journal data-entry surface. */}
        <p className="text-[12px] text-slate-400">
          {t('monitoring.physicalJournalNote', {
            defaultValue: "Yozuvlar rasmiy muhrlangan jismoniy jurnalda ham yuritiladi — bu platforma uni to'ldiradi, o'rnini bosmaydi.",
          })}
        </p>

        {/* Emotional tab */}
        {activeTab === 'emotional' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowBulkFill(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('bulkMonitoring.openButton', { defaultValue: "Hammasini birga to'ldirish" })}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map((child) => {
                const todayRecord = getRecordForChild(child.id, todayLocal());
                return (
                  <Card key={child.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                          <Baby className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{child.firstName} {child.lastName}</h3>
                          <p className="text-sm text-slate-500">{child.parentName}</p>
                          <p className="text-xs text-slate-400">{child.childSchool?.name || ''}, {child.class}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {todayRecord ? (
                        <div className="flex items-center gap-2 text-sm text-success-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('monitoring.assessedToday')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <FileX className="w-4 h-4" />
                          <span>{t('monitoring.notAssessedToday')}</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenModal(child, todayRecord)}
                        className="w-full px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                      >
                        {todayRecord ? (<><Edit2 className="w-4 h-4" />{t('monitoring.edit')}</>) : (<><Plus className="w-4 h-4" />{t('monitoring.assess')}</>)}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Daily tab */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            <ChildSelector />
            <DailyMonitoringTab childId={selectedChildId} />
          </div>
        )}

        {/* Weekly tab */}
        {activeTab === 'weekly' && (
          <div className="space-y-4">
            <ChildSelector />
            <WeeklyMonitoringTab childId={selectedChildId} />
          </div>
        )}

        {/* Emotional modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-surface border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingRecord ? t('monitoring.editModal') : t('monitoring.createModal')}
                </h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {selectedChild && (
                  <div className="bg-brand-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Baby className="w-5 h-5 text-brand-600" />
                      <div>
                        <p className="font-semibold text-slate-900">{selectedChild.firstName} {selectedChild.lastName}</p>
                        <p className="text-sm text-slate-600">{selectedChild.parentName}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('monitoring.date')}</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">{t('monitoring.emotionalState')}</label>
                  <div className="space-y-3">
                    {EMOTIONAL_KEYS.map((key) => (
                      <label key={key} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.emotionalState[key] || false}
                          onChange={() => toggleEmotionalState(key)}
                          className="mt-1 w-5 h-5 text-brand-600 border-slate-200 rounded focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-700 flex-1">{t(`monitoring.emotionalStates.${key}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('monitoring.notes')}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder={t('monitoring.notesPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('monitoring.teacherSignature')}</label>
                  <input
                    type="text"
                    value={formData.teacherSignature}
                    onChange={(e) => setFormData(prev => ({ ...prev, teacherSignature: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder={t('monitoring.teacherSignaturePlaceholder')}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button type="submit" className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    {t('monitoring.save')}
                  </button>
                  <button type="button" onClick={handleCloseModal} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                    {t('monitoring.cancel')}
                  </button>
                  {editingRecord && (
                    <button type="button" onClick={() => handleDelete(editingRecord.id)} className="px-6 py-3 bg-error-100 text-error-700 rounded-lg hover:bg-error-200 transition-colors font-medium flex items-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      {t('monitoring.delete')}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      <MonitoringBulkFill
        open={showBulkFill}
        onClose={() => setShowBulkFill(false)}
        childrenList={children}
        onSaved={() => { loadMonitoringRecords(true); }}
      />
    </>
  );
};

export default MonitoringJournal;
