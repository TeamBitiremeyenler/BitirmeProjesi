import { useMemo } from "react";
import { useSearchBox, useCurrentRefinements } from "react-instantsearch-core";

/**
 * Hook to check if search query or filters are currently applied
 * @returns Object with hasSearch, hasFilters, and hasRefinements (either search or filters)
 */
export const useRefinementStatus = () => {
  const { query } = useSearchBox();
  const { items: refinements } = useCurrentRefinements();

  const hasSearch = useMemo(() => {
    return Boolean(query && query.trim().length > 0);
  }, [query]);

  const hasFilters = useMemo(() => {
    return refinements.length > 0;
  }, [refinements]);

  const hasRefinements = useMemo(() => {
    return hasSearch || hasFilters;
  }, [hasSearch, hasFilters]);

  return {
    hasSearch,
    hasFilters,
    hasRefinements,
  };
};
