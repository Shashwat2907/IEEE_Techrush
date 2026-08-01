import { useFilters } from '../../context/FilterContext';
import { getAllTypes, getAllSeasons, getBudgetTiers } from '../../services/destinations';

const TYPE_ICONS = {
  beach: '🏖️',
  culture: '🏛️',
  adventure: '🏔️',
  nature: '🌿',
  heritage: '🏰',
  urban: '🌃',
};

const SEASON_ICONS = {
  spring: '🌸',
  summer: '☀️',
  monsoon: '🌧️',
  autumn: '🍂',
  winter: '❄️',
};

const BUDGET_ICONS = {
  budget: '💚',
  mid: '💛',
  premium: '💎',
};

export default function GlobeFilters() {
  const {
    filters,
    toggleType,
    toggleSeason,
    setBudgetTier,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  const types = getAllTypes();
  const seasons = getAllSeasons();
  const budgets = getBudgetTiers();

  return (
    <div className="flex justify-center px-4 mt-3">
      <div className="max-w-2xl w-full">
        {/* Filter chips row */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Type filters */}
          {types.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`chip ${filters.types.includes(type) ? 'active' : ''}`}
            >
              <span>{TYPE_ICONS[type] || '📍'}</span>
              <span className="capitalize">{type}</span>
            </button>
          ))}

          {/* Divider */}
          <span className="w-px h-6 bg-surface-raised mx-1" />

          {/* Season filters */}
          {seasons.map(season => (
            <button
              key={season}
              onClick={() => toggleSeason(season)}
              className={`chip ${filters.seasons.includes(season) ? 'active' : ''}`}
            >
              <span>{SEASON_ICONS[season]}</span>
              <span className="capitalize">{season}</span>
            </button>
          ))}

          {/* Divider */}
          <span className="w-px h-6 bg-surface-raised mx-1" />

          {/* Budget filters */}
          {budgets.map(tier => (
            <button
              key={tier}
              onClick={() => setBudgetTier(tier)}
              className={`chip ${filters.budgetTier === tier ? 'active' : ''}`}
            >
              <span>{BUDGET_ICONS[tier]}</span>
              <span className="capitalize">{tier}</span>
            </button>
          ))}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="chip border-accent-rust/50 text-accent-rust hover:bg-accent-rust/10"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="text-center mt-2">
            <span className="text-[11px] text-text-secondary font-mono">
              Showing destinations matching{' '}
              {[
                ...filters.types,
                ...filters.seasons,
                filters.budgetTier,
              ].filter(Boolean).join(' + ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
