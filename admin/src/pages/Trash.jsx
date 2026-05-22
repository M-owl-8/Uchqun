import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { Trash2 } from 'lucide-react';

const TABS = ['parents', 'receptions'];

const Trash = () => {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const toastSuccessRef = useRef(toastSuccess);
  toastSuccessRef.current = toastSuccess;
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const [activeTab, setActiveTab] = useState('parents');
  const [items, setItems] = useState({ parents: null, receptions: null });
  const [loadingTab, setLoadingTab] = useState({ parents: false, receptions: false });
  const [restoring, setRestoring] = useState({});

  const fetchTab = async (tab) => {
    setLoadingTab(prev => ({ ...prev, [tab]: true }));
    try {
      const endpoint = tab === 'parents'
        ? '/admin/parents?include_deleted=true'
        : '/admin/receptions?include_deleted=true';
      const res = await api.get(endpoint);
      setItems(prev => ({ ...prev, [tab]: res.data?.data ?? [] }));
    } catch {
      toastErrorRef.current(t('trash.loadError', { defaultValue: 'Failed to load deleted records' }));
    } finally {
      setLoadingTab(prev => ({ ...prev, [tab]: false }));
    }
  };

  useEffect(() => {
    if (items[activeTab] === null) {
      fetchTab(activeTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleRestore = async (id) => {
    setRestoring(prev => ({ ...prev, [id]: true }));
    try {
      await api.put(`/admin/users/${id}/restore`);
      setItems(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).filter(item => item.id !== id),
      }));
      toastSuccessRef.current(t('trash.restoreSuccess', { defaultValue: 'Record restored successfully' }));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'RESTORE_NOT_DELETED') {
        toastErrorRef.current(t('trash.notDeleted', { defaultValue: 'This record is not deleted' }));
      } else {
        toastErrorRef.current(t('trash.restoreError', { defaultValue: 'Failed to restore record' }));
      }
    } finally {
      setRestoring(prev => ({ ...prev, [id]: false }));
    }
  };

  const currentItems = items[activeTab];
  const isLoading = loadingTab[activeTab];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 className="w-6 h-6 text-error-500" />
        <h1 className="text-2xl font-bold text-gray-900">
          {t('trash.title', { defaultValue: 'Trash' })}
        </h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(`trash.tab.${tab}`, { defaultValue: tab === 'parents' ? 'Parents' : 'Receptions' })}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center text-gray-500 py-12">
          {t('trash.loading', { defaultValue: 'Loading…' })}
        </div>
      )}

      {!isLoading && currentItems !== null && currentItems.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t('trash.empty', { defaultValue: 'No deleted records' })}</p>
        </div>
      )}

      {!isLoading && currentItems !== null && currentItems.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  {t('trash.col.name', { defaultValue: 'Name' })}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  {t('trash.col.email', { defaultValue: 'Email' })}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  {t('trash.col.deletedAt', { defaultValue: 'Deleted' })}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.firstName} {item.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.email}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {item.deletedAt
                      ? new Date(item.deletedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(item.id)}
                      disabled={!!restoring[item.id]}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition-colors"
                    >
                      {restoring[item.id]
                        ? t('trash.restoring', { defaultValue: 'Restoring…' })
                        : t('trash.restore', { defaultValue: 'Restore' })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Trash;
