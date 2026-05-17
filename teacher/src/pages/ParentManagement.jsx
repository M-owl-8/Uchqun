import { useEffect, useState } from 'react';
import { 
  Baby,
  Mail,
  Phone,
  Search,
  Users,
} from 'lucide-react';
import Card from '../shared/components/Card';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useToast } from '../shared/context/ToastContext';
import api from '../shared/services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../shared/context/AuthContext';

const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { error: showError } = useToast();
  const { t } = useTranslation();
  useAuth();

  useEffect(() => {
    const controller = new AbortController();
    const loadParents = async (signal) => {
      try {
        setLoading(true);
        const response = await api.get('/teacher/parents', { signal });
        const list = Array.isArray(response.data.parents) ? response.data.parents : [];
        setParents(list);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        showError(error.response?.data?.error || t('parentsPage.noParentsFound'));
        setParents([]);
      } finally {
        setLoading(false);
      }
    };
    loadParents(controller.signal);
    return () => controller.abort();
  }, [showError, t]);

  const filteredParents = parents.filter((parent) => {
    const query = searchQuery.toLowerCase();
    return (
      parent.firstName?.toLowerCase().includes(query) ||
      parent.lastName?.toLowerCase().includes(query) ||
      parent.email?.toLowerCase().includes(query) ||
      parent.phone?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('parentsPage.title')}</h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">{t('parentsPage.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('parentsPage.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-surface border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {filteredParents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParents.map((parent) => (
            <Card key={parent.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                    {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {parent.firstName} {parent.lastName}
                    </h3>
                    <p className="text-sm text-slate-500">{parent.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{parent.email}</span>
                </div>
                {parent.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{parent.phone}</span>
                  </div>
                )}
                {parent.children && parent.children.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-brand-600 font-medium">
                    <Baby className="w-4 h-4" />
                    <span>{t('parentsPage.children', { count: parent.children.length })}</span>
                  </div>
                )}
                {(!parent.children || parent.children.length === 0) && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 italic">
                    <Baby className="w-4 h-4" />
                    <span>{t('parentsPage.noChildInfo')}</span>
                  </div>
                )}
              </div>

              {/* Children List */}
              {parent.children && parent.children.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Children:</p>
                  <div className="space-y-2">
                    {parent.children.map(child => (
                      <div key={child.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Baby className="w-4 h-4 text-brand-400" />
                          <span className="text-sm text-slate-700">
                            {child.firstName} {child.lastName}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({child.childSchool?.name || ''}, {child.class})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">
            {searchQuery ? t('parentsPage.noParentsFound') : t('parentsPage.noParents')}
          </p>
        </Card>
      )}
    </div>
  );
};

export default ParentManagement;
