import { Baby, Edit2, Mail, Phone, Trash2, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/Card';

const ParentCard = ({ parent, onAddChild, onEdit, onDelete, onEditChild, onDeleteChild }) => {
  const { t } = useTranslation();

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
            {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {parent.firstName} {parent.lastName}
            </h3>
            <p className="text-sm text-gray-500">{parent.email}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span>{parent.email}</span>
        </div>
        {parent.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{parent.phone}</span>
          </div>
        )}

        {(parent.assignedTeacher || parent.group) && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>{t('parentsPage.assignment')}</span>
            </div>
            <div className="space-y-2">
              {parent.assignedTeacher && (
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{t('parentsPage.teacherLabel')}</span> {parent.assignedTeacher.firstName} {parent.assignedTeacher.lastName}
                  </p>
                </div>
              )}
              {parent.group && (
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{t('parentsPage.groupLabel')}</span> {parent.group.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {parent.children && parent.children.length > 0 ? (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Baby className="w-4 h-4 text-primary-600" />
              <span>{t('parentsPage.children', { count: parent.children.length })}</span>
            </div>
            <div className="space-y-2">
              {parent.children.map((child) => (
                <div key={child.id} className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        {(child.photo || child.photoUrl) ? (
                          <img
                            src={child.photo || child.photoUrl}
                            alt={`${child.firstName} ${child.lastName}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                            {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {child.firstName} {child.lastName}
                          </p>
                          <div className="mt-1 space-y-1">
                            {child.teacher && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Teacher:</span> {child.teacher}
                              </p>
                            )}
                            {child.disabilityType && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">{t('parentsPage.disability')}</span> {child.disabilityType}
                              </p>
                            )}
                            {child.medicalDiagnosis && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">{t('parentsPage.diagnosis')}</span> {child.medicalDiagnosis}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditChild(parent.id, child)}
                        className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                        title={t('parentsPage.editChildTitle')}
                        aria-label={`${t('parentsPage.editChildTitle')} — ${child.firstName} ${child.lastName}`}
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => onDeleteChild(parent.id, child.id)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title={t('parentsPage.buttons.delete')}
                        aria-label={`${t('parentsPage.buttons.delete')} — ${child.firstName} ${child.lastName}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 italic pt-3 border-t border-gray-100">
            <Baby className="w-4 h-4" />
            <span>{t('parentsPage.noChildrenRegistered')}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={() => onAddChild(parent.id)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-primary-50 text-primary-600 rounded-lg font-medium hover:bg-primary-100 transition-colors text-sm min-w-0"
        >
          <Baby className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{t('parentsPage.buttons.addChild')}</span>
        </button>
        <button
          onClick={() => onEdit(parent)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm min-w-0"
        >
          <Edit2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{t('parentsPage.buttons.edit')}</span>
        </button>
        <button
          onClick={() => onDelete(parent.id)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm min-w-0"
        >
          <Trash2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{t('parentsPage.buttons.delete')}</span>
        </button>
      </div>
    </Card>
  );
};

export default ParentCard;
