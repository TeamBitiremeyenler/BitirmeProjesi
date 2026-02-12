import React from "react";
import { InstantSearch } from "react-instantsearch-core";
import { searchClient, ALGOLIA_INDEX_NAME } from "../config/algolia";

interface AlgoliaProviderProps {
  children: React.ReactNode;
}

export function AlgoliaProvider({ children }: AlgoliaProviderProps) {
  return (
    <InstantSearch searchClient={searchClient} indexName={ALGOLIA_INDEX_NAME}>
      {children}
    </InstantSearch>
  );
}
