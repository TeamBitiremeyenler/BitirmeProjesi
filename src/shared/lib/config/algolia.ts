import { algoliasearch } from "algoliasearch";

const appId = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID;
const searchApiKey = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_API_KEY;
const indexName = process.env.EXPO_PUBLIC_ALGOLIA_INDEX_NAME;

if (!appId || !searchApiKey || !indexName) {
  throw new Error(
    "Missing Algolia configuration. Please ensure EXPO_PUBLIC_ALGOLIA_APP_ID, EXPO_PUBLIC_ALGOLIA_SEARCH_API_KEY, and EXPO_PUBLIC_ALGOLIA_INDEX_NAME are set in your environment variables."
  );
}

export const searchClient = algoliasearch(appId, searchApiKey);

export const ALGOLIA_INDEX_NAME = indexName;
