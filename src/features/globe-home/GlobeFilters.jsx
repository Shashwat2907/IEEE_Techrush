import { useFilters } from '../../context/FilterContext';
import { getAllTypes, getAllSeasons, getBudgetTiers } from '../../services/destinations';
import {
  BeachIcon,
  LandmarkIcon,
  MountainIcon,
  TreeIcon,
  BuildingIcon,
  SunIcon,
  RainIcon,
  LeafIcon,
  SnowflakeIcon,
  CloseIcon,
} from '../../components/ui/Icons';

const TYPE_ICONS = {
  beach: BeachIcon,
  culture: LandmarkIcon,
  adventure: MountainIcon,
  nature: TreeIcon,
  heritage: LandmarkIcon,
  urban: BuildingIcon,
};

const SEASON_ICONS = {
  spring: LeafIcon,
  summer: SunIcon,
  monsoon: RainIcon,
  autumn: LeafIcon,
  winter: SnowflakeIcon,
};

const BUDGET_LABELS = {
  budget: '$',
  mid: '$$',
  premium: '$$$',
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
    <div className="flex justify-center px-2 py-1 w-full select-none">
      <div className="max-w-2xl w-full">
        {/* Filter chips row */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Type filters */}
          {types.map((type) => {
            const Icon = TYPE_ICONS[type] || LandmarkIcon;
            const isActive = filters.types.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`chip flex items-center gap-1.5 ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}

          {/* Divider */}
          <span className="w-px h-5 bg-white/10 mx-1" />

          {/* Season filters */}
          {seasons.map((season) => {
            const Icon = SEASON_ICONS[season] || SunIcon;
            const isActive = filters.seasons.includes(season);
            return (
              <button
                key={season}
                onClick={() => toggleSeason(season)}
                className={`chip flex items-center gap-1.5 ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{season}</span>
              </button>
            );
          })}

          {/* Divider */}
          <span className="w-px h-5 bg-white/10 mx-1" />

          {/* Budget filters */}
          {budgets.map((tier) => (
            <button
              key={tier}
              onClick={() => setBudgetTier(tier)}
              className={`chip flex items-center gap-1 font-mono ${filters.budgetTier === tier ? 'active font-bold text-accent-sky' : ''}`}
            >
              <span>{BUDGET_LABELS[tier]}</span>
              <span className="capitalize font-body text-xs">{tier}</span>
            </button>
          ))}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="chip border-accent-rose/50 text-accent-rose hover:bg-accent-rose/10 flex items-center gap-1"
            >
              <CloseIcon className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="text-center mt-2.5">
            <span className="text-[11px] text-text-secondary font-mono">
              Filtered by:{' '}
              {[
                ...filters.types,
                ...filters.seasons,
                filters.budgetTier,
              ]
                .filter(Boolean)
                .join(' + ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
