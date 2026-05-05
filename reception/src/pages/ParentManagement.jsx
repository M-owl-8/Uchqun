// Reception ParentManagement - Updated with Edit Child functionality
import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import { SkeletonList } from '../../../shared/components/Skeleton';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Mail,
  Phone,
  X,
  Save,
  Baby,
  UserCheck,
  UsersRound,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false); // New state for edit child modal
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null); // New state for selected child
  const [editingParent, setEditingParent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    teacherId: '',
    groupId: '',
    child: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Male',
      disabilityType: '',
      medicalDiagnosis: '',
      specialNeeds: '',
      school: 'Uchqun School',
    },
  });
  const [childFormData, setChildFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Male',
    disabilityType: '',
    medicalDiagnosis: '',
    specialNeeds: '',
    school: 'Uchqun School',
    photo: null,
    photoPreview: null,
  });
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const { success, error: showError } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showChildPassword, setShowChildPassword] = useState(false);

  useEffect(() => {
    loadParents();
    loadTeachersAndGroups();
  }, []);

  const loadTeachersAndGroups = async () => {
    try {
      const [teachersRes, groupsRes] = await Promise.all([
        api.get('/reception/teachers').catch(() => ({ data: { data: [] } })),
        api.get('/groups').catch(() => ({ data: { groups: [] } }))
      ]);
      setTeachers(Array.isArray(teachersRes.data.data) ? teachersRes.data.data : []);
      setGroups(Array.isArray(groupsRes.data.groups) ? groupsRes.data.groups : []);
    } catch (error) {
    }
  };

  // Filter groups based on selected teacher
  const filteredGroups = formData.teacherId
    ? groups.filter(group => group.teacherId === formData.teacherId)
    : groups;

  const loadParents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reception/parents');
      setParents(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      showError(error.response?.data?.error || t('parentsPage.toastLoadError'));
      setParents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingParent(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      teacherId: '',
      groupId: '',
      child: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'Male',
        disabilityType: '',
        specialNeeds: '',
        school: 'Uchqun School',
        photo: null,
      },
    });
    setShowModal(true);
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setFormData({
      firstName: parent.firstName || '',
      lastName: parent.lastName || '',
      email: parent.email || '',
      phone: parent.phone || '',
      password: '',
      teacherId: parent.teacherId || '',
      groupId: parent.groupId || '',
    });
    setShowModal(true);
  };

  const handleDelete = (parentId) => {
    setConfirmDialog({
      message: t('parentsPage.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/reception/parents/${parentId}`);
          success(t('parentsPage.toastDelete'));
          loadParents();
        } catch (error) {
          showError(error.response?.data?.error || t('parentsPage.toastDeleteError'));
        }
      },
    });
  };

  // NEW: Handle Edit Child
  const handleEditChild = (parentId, child) => {
    setSelectedParentId(parentId);
    setSelectedChild(child);
    setChildFormData({
      firstName: child.firstName || '',
      lastName: child.lastName || '',
      dateOfBirth: child.dateOfBirth ? child.dateOfBirth.split('T')[0] : '',
      gender: child.gender || 'Male',
      disabilityType: child.disabilityType || '',
      specialNeeds: child.specialNeeds || '',
      school: child.school || 'Uchqun School',
      photo: null,
      photoPreview: (child.photo || child.photoUrl) || null,
    });
    setShowEditChildModal(true);
  };

  // NEW: Handle Delete Child
  const handleDeleteChild = (parentId, childId) => {
    setConfirmDialog({
      message: t('parentsPage.confirmDeleteChild'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/reception/children/${childId}`);
          success(t('parentsPage.toastDeleteChild'));
          loadParents();
        } catch (error) {
          showError(error.response?.data?.error || t('parentsPage.toastDeleteError'));
        }
      },
    });
  };

  const handleAddChild = (parentId) => {
    setSelectedParentId(parentId);
    setSelectedChild(null);
    setChildFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Male',
      disabilityType: '',
      specialNeeds: '',
      school: 'Uchqun School',
      photo: null,
      photoPreview: null,
    });
    setShowChildModal(true);
  };

  const handleSubmitChild = async (e) => {
    e.preventDefault();
    
    if (!selectedParentId) {
      showError(t('parentsPage.parentIdMissing'));
      return;
    }

    // Validate required fields
    if (!childFormData.firstName || !childFormData.lastName || !childFormData.dateOfBirth || 
        !childFormData.disabilityType || !childFormData.school) {
      showError(t('parentsPage.childRequiredFields'));
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('parentId', selectedParentId);
      formDataToSend.append('child[firstName]', childFormData.firstName.trim());
      formDataToSend.append('child[lastName]', childFormData.lastName.trim());
      formDataToSend.append('child[dateOfBirth]', childFormData.dateOfBirth);
      formDataToSend.append('child[gender]', childFormData.gender || 'Male');
      formDataToSend.append('child[disabilityType]', childFormData.disabilityType.trim());
      if (childFormData.medicalDiagnosis) {
        formDataToSend.append('child[medicalDiagnosis]', childFormData.medicalDiagnosis.trim());
      }
      if (childFormData.specialNeeds) {
        formDataToSend.append('child[specialNeeds]', childFormData.specialNeeds.trim());
      }
      formDataToSend.append('child[school]', childFormData.school.trim());
      if (childFormData.photo) {
        formDataToSend.append('child[photo]', childFormData.photo);
      }
      
      // Debug: Log FormData contents
      
      await api.post('/reception/children', formDataToSend);
      success(t('parentsPage.toastChildAdded'));
      setShowChildModal(false);
      loadParents();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || t('parentsPage.failedAddChild');
      const errorDetails = error.response?.data?.missing ? `Missing: ${JSON.stringify(error.response.data.missing)}` : '';
      showError(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
  };

  // NEW: Handle Update Child
  const handleUpdateChild = async (e) => {
    e.preventDefault();
    
    if (!selectedParentId || !selectedChild?.id) {
      showError(t('parentsPage.parentIdMissing'));
      return;
    }

    // Validate required fields
    if (!childFormData.firstName || !childFormData.lastName || !childFormData.dateOfBirth || 
        !childFormData.disabilityType || !childFormData.school) {
      showError(t('parentsPage.childRequiredFields'));
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('parentId', selectedParentId);
      formDataToSend.append('child[firstName]', childFormData.firstName.trim());
      formDataToSend.append('child[lastName]', childFormData.lastName.trim());
      formDataToSend.append('child[dateOfBirth]', childFormData.dateOfBirth);
      formDataToSend.append('child[gender]', childFormData.gender || 'Male');
      formDataToSend.append('child[disabilityType]', childFormData.disabilityType.trim());
      if (childFormData.medicalDiagnosis) {
        formDataToSend.append('child[medicalDiagnosis]', childFormData.medicalDiagnosis.trim());
      }
      if (childFormData.specialNeeds) {
        formDataToSend.append('child[specialNeeds]', childFormData.specialNeeds.trim());
      }
      formDataToSend.append('child[school]', childFormData.school.trim());
      if (childFormData.photo) {
        formDataToSend.append('child[photo]', childFormData.photo);
      }
      
      await api.put(`/reception/children/${selectedChild.id}`, formDataToSend);
      success(t('parentsPage.toastChildUpdated'));
      setShowEditChildModal(false);
      loadParents();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || t('parentsPage.failedUpdateChild');
      const errorDetails = error.response?.data?.missing ? `Missing: ${JSON.stringify(error.response.data.missing)}` : '';
      showError(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
  };

  // NEW: Handle photo change for child
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleChildPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showError(t('parentsPage.invalidFileType', { defaultValue: 'Only JPEG, PNG, WebP and GIF images are allowed' }));
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showError(t('parentsPage.fileTooLarge', { defaultValue: 'Image must be smaller than 5 MB' }));
      e.target.value = '';
      return;
    }
    setChildFormData({
      ...childFormData,
      photo: file,
      photoPreview: URL.createObjectURL(file),
    });
  };

  // NEW: Remove photo
  const handleRemovePhoto = () => {
    setChildFormData({
      ...childFormData,
      photo: null,
      photoPreview: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate group is required for new parents (ensures proper data flow)
    if (!editingParent && !formData.groupId) {
      showError(t('parentsPage.form.groupRequiredError') || 'Guruh tanlash majburiy');
      return;
    }

    try {
      if (editingParent) {
        // Update parent info
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          teacherId: formData.teacherId || null,
          groupId: formData.groupId || null,
        };
        // Include password in update if provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/reception/parents/${editingParent.id}`, updateData);
        
        success(t('parentsPage.toastUpdate'));
      } else {
        // Create FormData for file upload
        const formDataToSend = new FormData();
        formDataToSend.append('firstName', formData.firstName);
        formDataToSend.append('lastName', formData.lastName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('password', formData.password);
        if (formData.teacherId) formDataToSend.append('teacherId', formData.teacherId);
        if (formData.groupId) formDataToSend.append('groupId', formData.groupId);
        
        // Add child data if provided
        if (formData.child.firstName && formData.child.lastName) {
          formDataToSend.append('child[firstName]', formData.child.firstName);
          formDataToSend.append('child[lastName]', formData.child.lastName);
          formDataToSend.append('child[dateOfBirth]', formData.child.dateOfBirth);
          formDataToSend.append('child[gender]', formData.child.gender);
          formDataToSend.append('child[disabilityType]', formData.child.disabilityType);
          if (formData.child.medicalDiagnosis) formDataToSend.append('child[medicalDiagnosis]', formData.child.medicalDiagnosis);
          if (formData.child.specialNeeds) formDataToSend.append('child[specialNeeds]', formData.child.specialNeeds);
          formDataToSend.append('child[school]', formData.child.school);
          // Add photo file if selected
          if (formData.child.photo) {
            formDataToSend.append('child[photo]', formData.child.photo);
          }
        }
        
        // Axios automatically sets Content-Type for FormData, don't set it manually
        await api.post('/reception/parents', formDataToSend);
        success(t('parentsPage.toastCreate'));
      }
      
      setShowModal(false);
      loadParents();
    } catch (error) {
      showError(error.response?.data?.error || t('parentsPage.toastSaveError'));
    }
  };

  const filteredParents = useMemo(() => parents.filter((parent) => {
    const query = searchQuery.toLowerCase();
    return (
      parent.firstName?.toLowerCase().includes(query) ||
      parent.lastName?.toLowerCase().includes(query) ||
      parent.email?.toLowerCase().includes(query) ||
      parent.phone?.toLowerCase().includes(query)
    );
  }), [parents, searchQuery]);

  if (loading) {
    return <SkeletonList items={8} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('parentsPage.title')}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('parentsPage.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <form role="search" aria-label={t('parentsPage.search')} className="relative flex-1 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('parentsPage.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('parentsPage.search')}
              className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-64"
            />
          </form>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('parentsPage.add')}</span>
          </button>
        </div>
      </div>

      {filteredParents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParents.map((parent) => (
            <Card key={parent.id} className="p-6 hover:shadow-lg transition-shadow">
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
                
                {/* Teacher and Group Section */}
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
                
                {/* Children Section */}
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
                                onClick={() => handleEditChild(parent.id, child)}
                                className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                                title={t('parentsPage.editChildTitle')}
                                aria-label={`${t('parentsPage.editChildTitle')} — ${child.firstName} ${child.lastName}`}
                              >
                                <Edit2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handleDeleteChild(parent.id, child.id)}
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
                  onClick={() => handleAddChild(parent.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-primary-50 text-primary-600 rounded-lg font-medium hover:bg-primary-100 transition-colors text-sm min-w-0"
                >
                  <Baby className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('parentsPage.buttons.addChild')}</span>
                </button>
                <button
                  onClick={() => handleEdit(parent)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm min-w-0"
                >
                  <Edit2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('parentsPage.buttons.edit')}</span>
                </button>
                <button
                  onClick={() => handleDelete(parent.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm min-w-0"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('parentsPage.buttons.delete')}</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium text-lg">
            {searchQuery ? t('parentsPage.noParentsFound') : t('parentsPage.noParents')}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Parent
            </button>
          )}
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="parent-modal-title"
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 id="parent-modal-title" className="text-2xl font-bold text-gray-900">
                {editingParent ? t('parentsPage.form.update') + ' ' + t('nav.parents') : t('parentsPage.add')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('common.close', { defaultValue: 'Close' })}
              >
                <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} aria-label={editingParent ? t('parentsPage.form.update') : t('parentsPage.add')} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.firstName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.lastName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.email')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingParent}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.teacher')}
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => {
                      const selectedTeacherId = e.target.value;
                      setFormData({ 
                        ...formData, 
                        teacherId: selectedTeacherId,
                        groupId: '' // Reset group when teacher changes
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.group')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.groupId}
                    onChange={(e) => {
                      const selectedGroupId = e.target.value;
                      const selectedGroup = groups.find(g => g.id === selectedGroupId);
                      setFormData({
                        ...formData,
                        groupId: selectedGroupId,
                        // Auto-set teacher from group if no teacher was selected
                        teacherId: selectedGroup?.teacherId || formData.teacherId
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('parentsPage.form.group')} tanlang</option>
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Avval o'qituvchi tanlang</option>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">{t('parentsPage.form.groupRequired') || 'Guruh tanlash majburiy - bu bolaning faoliyat va ovqatlarini ko\'rish uchun kerak'}</p>
                </div>
              </div>

              {!editingParent && (
                <>
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('parentsPage.form.child')}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('parentsPage.form.childFirstName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.child.firstName}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            child: { ...formData.child, firstName: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('parentsPage.form.childLastName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.child.lastName}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            child: { ...formData.child, lastName: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('parentsPage.form.childDob')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.child.dateOfBirth}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            child: { ...formData.child, dateOfBirth: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('parentsPage.form.childGender')} <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.child.gender}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            child: { ...formData.child, gender: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="Male">Erkak</option>
                          <option value="Female">Ayol</option>
                          <option value="Other">Boshqa</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('parentsPage.form.childDisability')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.child.disabilityType}
                        onChange={(e) => setFormData({
                          ...formData,
                          child: { ...formData.child, disabilityType: e.target.value }
                        })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('parentsPage.form.childDiagnosis', { defaultValue: 'Tashxis' })}
                      </label>
                      <input
                        type="text"
                        value={formData.child.medicalDiagnosis || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          child: { ...formData.child, medicalDiagnosis: e.target.value }
                        })}
                        placeholder="F71 - ..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.childSpecialNeeds')}</label>
                      <textarea
                        value={formData.child.specialNeeds}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          child: { ...formData.child, specialNeeds: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('parentsPage.form.childSchool')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.child.school}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            child: { ...formData.child, school: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingParent ? t('parentsPage.form.update') : t('parentsPage.form.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Bola qo'shish</h2>
              <button
                onClick={() => {
                  setShowChildModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitChild} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childFirstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={childFormData.firstName}
                    onChange={(e) => setChildFormData({ ...childFormData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childLastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={childFormData.lastName}
                    onChange={(e) => setChildFormData({ ...childFormData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childDob')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={childFormData.dateOfBirth}
                    onChange={(e) => setChildFormData({ ...childFormData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childGender')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={childFormData.gender}
                    onChange={(e) => setChildFormData({ ...childFormData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Male">{t('gender.male', 'Erkak')}</option>
                    <option value="Female">{t('gender.female', 'Ayol')}</option>
                    <option value="Other">{t('gender.other', 'Boshqa')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parentsPage.form.childDisability')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childFormData.disabilityType}
                  onChange={(e) => setChildFormData({ ...childFormData, disabilityType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.childSpecialNeeds')}</label>
                <textarea
                  value={childFormData.specialNeeds}
                  onChange={(e) => setChildFormData({ ...childFormData, specialNeeds: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parentsPage.form.childSchool')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childFormData.school}
                  onChange={(e) => setChildFormData({ ...childFormData, school: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parentsPage.form.childPhoto')}
                </label>
                <div className="flex items-center gap-4">
                  {childFormData.photoPreview ? (
                    <div className="relative">
                      <img
                        src={childFormData.photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="childPhoto"
                      accept="image/*"
                      onChange={handleChildPhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="childPhoto"
                      className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      {t('parentsPage.form.uploadPhoto')}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('parentsPage.form.photoSize')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChildModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('parentsPage.form.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t('parentsPage.buttons.addChild')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {showEditChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('parentsPage.editChildTitle')}</h2>
              <button
                onClick={() => {
                  setShowEditChildModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateChild} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childFirstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={childFormData.firstName}
                    onChange={(e) => setChildFormData({ ...childFormData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childLastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={childFormData.lastName}
                    onChange={(e) => setChildFormData({ ...childFormData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childDob')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={childFormData.dateOfBirth}
                    onChange={(e) => setChildFormData({ ...childFormData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('parentsPage.form.childGender')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={childFormData.gender}
                    onChange={(e) => setChildFormData({ ...childFormData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Male">{t('gender.male', 'Erkak')}</option>
                    <option value="Female">{t('gender.female', 'Ayol')}</option>
                    <option value="Other">{t('gender.other', 'Boshqa')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parentsPage.form.childDisability')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childFormData.disabilityType}
                  onChange={(e) => setChildFormData({ ...childFormData, disabilityType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.childSpecialNeeds')}</label>
                <textarea
                  value={childFormData.specialNeeds}
                  onChange={(e) => setChildFormData({ ...childFormData, specialNeeds: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parentsPage.form.childSchool')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childFormData.school}
                  onChange={(e) => setChildFormData({ ...childFormData, school: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parentsPage.form.childPhoto')}
                </label>
                <div className="flex items-center gap-4">
                  {childFormData.photoPreview ? (
                    <div className="relative">
                      <img
                        src={childFormData.photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="editChildPhoto"
                      accept="image/*"
                      onChange={handleChildPhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="editChildPhoto"
                      className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      {t('parentsPage.form.uploadPhoto')}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('parentsPage.form.photoSize')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditChildModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('parentsPage.form.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t('parentsPage.buttons.updateChild')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.confirm', { defaultValue: 'Confirm' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentManagement;