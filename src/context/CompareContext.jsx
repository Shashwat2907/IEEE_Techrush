import { createContext, useContext, useState, useCallback } from 'react';

const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState([]); // max 3 destinations

  const addToCompare = useCallback((destination) => {
    setCompareList(prev => {
      if (prev.length >= 3) return prev; // max 3
      if (prev.find(d => d.id === destination.id)) return prev; // no dupes
      return [...prev, destination];
    });
  }, []);

  const removeFromCompare = useCallback((id) => {
    setCompareList(prev => prev.filter(d => d.id !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isInCompare = useCallback((id) => {
    return compareList.some(d => d.id === id);
  }, [compareList]);

  return (
    <CompareContext.Provider
      value={{
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        canAddMore: compareList.length < 3,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}

export default CompareContext;
