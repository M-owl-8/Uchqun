import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ChildContext = createContext(null);

export const useChild = () => {
  const context = useContext(ChildContext);
  if (!context) {
    throw new Error('useChild must be used within ChildProvider');
  }
  return context;
};

export const ChildProvider = ({ children: childrenProp }) => {
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load children on mount
  useEffect(() => {
    loadChildren();
  }, []);

  // Load selected child from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedChildId');
    if (stored && childrenList.length > 0) {
      const childExists = childrenList.find(c => c.id === stored);
      if (childExists) {
        setSelectedChildId(stored);
      } else if (childrenList.length > 0) {
        // If stored child doesn't exist, select first child
        setSelectedChildId(childrenList[0].id);
      }
    } else if (childrenList.length > 0) {
      // If no stored selection, select first child
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get('/child');
      const childrenData = Array.isArray(response.data) ? response.data : [];
      setChildrenList(childrenData);
    } catch (error) {
      setChildrenList([]);
    } finally {
      setLoading(false);
    }
  };

  const selectChild = (childId) => {
    setSelectedChildId(childId);
    localStorage.setItem('selectedChildId', childId);
  };

  const selectedChild = childrenList.find(c => c.id === selectedChildId) || null;

  const value = {
    children: childrenList,
    selectedChild,
    selectedChildId,
    selectChild,
    loadChildren,
    loading,
  };

  return <ChildContext.Provider value={value}>{childrenProp}</ChildContext.Provider>;
};

