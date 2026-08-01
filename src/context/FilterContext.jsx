import { createContext, useContext, useState, useCallback } from 'react';

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    types: [],      // ['beach', 'culture', ...]
    seasons: [],    // ['summer', 'winter', ...]
    budgetTier: null,  // 'budget' | 'mid' | 'premium' | null
    crowdLevel: null,  // 'low' | 'medium' | 'high' | null
    search: '',
  });

  const toggleType = useCallback((type) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const toggleSeason = useCallback((season) => {
    setFilters(prev => ({
      ...prev,
      seasons: prev.seasons.includes(season)
        ? prev.seasons.filter(s => s !== season)
        : [...prev.seasons, season],
    }));
  }, []);

  const setBudgetTier = useCallback((tier) => {
    setFilters(prev => ({
      ...prev,
      budgetTier: prev.budgetTier === tier ? null : tier,
    }));
  }, []);

  const setCrowdLevel = useCallback((level) => {
    setFilters(prev => ({
      ...prev,
      crowdLevel: prev.crowdLevel === level ? null : level,
    }));
  }, []);

  const setSearch = useCallback((search) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ types: [], seasons: [], budgetTier: null, crowdLevel: null, search: '' });
  }, []);

  const hasActiveFilters = filters.types.length > 0 || filters.seasons.length > 0 ||
    filters.budgetTier !== null || filters.crowdLevel !== null;

  return (
    <FilterContext.Provider
      value={{
        filters,
        toggleType,
        toggleSeason,
        setBudgetTier,
        setCrowdLevel,
        setSearch,
        clearFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}

export default FilterContext;
