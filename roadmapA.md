# Smart Gallery — Implementation Roadmap

## Current Codebase State
The existing `BitirmeProjesi` app already has:
- ✅ Auth (Supabase) — login, register, onboarding screens
- ✅ Expo Router navigation skeleton
- ✅ Home screen with AI input UI
- ✅ Calendar, Profile, Photo-detail, Collection screens (stubs)
- ✅ Paywall / subscription UI
- ✅ i18n, Mixpanel analytics

---

## Phase 1 — Gallery Core (Local Media) 🖼️ ✅ COMPLETE
**Goal:** Replace the placeholder home screen with a real local gallery that reads from the device's media store.

### Mobile (React Native)
| Task | Status | Where |
|---|---|---|
| Request `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` permission | ✅ | `src/components/gallery/GalleryGrid.tsx` |
| Read device photos via `expo-media-library` | ✅ | `src/lib/media-library.ts` |
| Build **Gallery Grid** screen — infinite scroll, date grouping | ✅ | `src/app/home/index.tsx` + `GalleryGrid.tsx` |
| Build **Photo Detail** screen — full-screen viewer, EXIF info | ✅ | `src/app/photo-detail/[photo-id].tsx` |
| Build **Albums** tab — folder/album browsing | ✅ | `src/app/albums/` |
| Local UUID ↔ local_uri mapping store (AsyncStorage) | ✅ | `src/lib/local-sync-store.ts` |

> **Note:** Albums tab currently shows device folders. In Phase 5, face clusters will also or only appear here as "People" albums.

---

## Phase 2 — Backend Foundation 🐍 ← **NEXT**
**Goal:** Stand up the Python backend that the mobile app talks to.

### Backend (Python — `d:/asd/bitirme/BitirmeProjesi/backend/`)
| Task | Details |
|---|---|
| FastAPI project scaffold | `/app/main.py`, routers, middleware |
| **Supabase** integration — JWT validation, RLS | Auth middleware |
| PostgreSQL schema | `users`, `images`, `face_clusters`, `tags`, `vector` extension |
| **pgvector** setup | Supabase built-in vector similarity search |
| `/upload` endpoint | Accepts image + UUID, kicks off processing pipeline |
| `/search` endpoint | Accepts query text, returns ranked `Image_UUID` list |
| `/people` endpoint | Returns face clusters per user |
| Ephemeral processing guarantee | Delete binary after extraction completes |

---

## Phase 3 — Intelligence Pipeline 🤖
**Goal:** Process uploaded images to extract tags, faces, and embeddings.

### Backend AI Models
| Task | Library |
|---|---|
| **Image Captioning/Tagging** | BLIP (`transformers`) |
| **CLIP embeddings** for semantic search | `openai/clip` |
| **Face detection + encoding** | InsightFace / ArcFace |
| **Face clustering** (grouping into Person_IDs) | DBSCAN / AHC on face vectors |
| Async worker queue for processing | Celery + Redis OR FastAPI BackgroundTasks |

---

## Phase 4 — Semantic Search 🔍
**Goal:** Users type natural language → see matching local photos.

### Mobile
| Task | Where |
|---|---|
| Search screen with text input + result grid | `src/app/home/` → SearchScreen |
| Call `/search` API, resolve `Image_UUID` → local file | `src/lib/api/search.ts` |
| Show "offline / no results" graceful states | SearchScreen |

### Backend
| Task | Details |
|---|---|
| Vectorize user query with CLIP text encoder | `SearchService` |
| ANN search in pgvector (Supabase) → top-K `Image_UUID`s | `SearchService` |
| Enrich with SQL metadata (tags, date, person names) | `SearchService` |

---

## Phase 5 — People / Face Clustering 👥
**Goal:** Auto-group faces and let users name them.

### Mobile
| Task | Where |
|---|---|
| **People tab** — grid of face cluster thumbnails | new `src/app/people/` |
| **Person detail** — all photos of one person | new `src/app/people/[id].tsx` |
| Rename person UI | inline edit in PersonDetail |
| Upload image UUIDs for indexing on app launch (background) | `src/lib/sync-service.ts` |

---

## Phase 6 — Creative Suite (On-Device Editing) ✂️
**Goal:** Crop, rotate, filters, brightness/contrast — GPU-accelerated, fully offline.

### Mobile
| Task | Library |
|---|---|
| Integrate image editor | `expo-image-manipulator` or `react-native-image-crop-picker` |
| Filter/adjustment UI (brightness, contrast, saturation) | Custom sliders + canvas |
| Crop & rotate tool | `react-native-image-crop-picker` |
| Save edited photo back to device | `expo-media-library.saveToLibraryAsync` |

---

## Phase 7 — AI Wrapper / GenAI 🎨
**Goal:** Subscription-gated Generative AI requests proxied through backend (Nano Banana Pro).

### Mobile
| Task | Where |
|---|---|
| **Creative Studio** screen — prompt input + result display | new `src/app/creative-studio/` |
| Paywall gate (subscription check before sending prompt) | existing paywall components |
| Call backend `/ai/generate` endpoint | `src/lib/api/ai.ts` |

### Backend
| Task | Details |
|---|---|
| `/ai/generate` endpoint | Validates subscription, proxies to Nano Banana Pro |
| API key management (env vars only, never on client) | `.env` + server config |
| Rate limiting (e.g. 10 requests/hr/user) | FastAPI middleware |

---

## Phase 8 — Sync, Polish & Security 🔒
**Goal:** Production-ready app with security and offline support.

| Task | Details |
|---|---|
| Background sync on app launch | Upload new UUIDs since last sync |
| Offline banners for intelligence features | Graceful degradation |
| TLS / Certificate pinning | `react-native-ssl-pinning` |
| RLS verification on all Supabase queries | Backend audit |
| Ghost metadata cleanup | Remove server metadata for locally deleted images |

---

## Recommended Order to Start
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

---

## Tech Stack Quick Reference
| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 54), expo-router v6 |
| Backend | Python, FastAPI |
| Auth | Supabase (JWT + RLS) |
| SQL DB | PostgreSQL (via Supabase) |
| Vector DB | pgvector (via Supabase) |
| Object Detection / Captioning | BLIP (transformers) |
| Semantic Embeddings | CLIP (openai/clip) |
| Face Analysis | InsightFace / ArcFace |
| GenAI | Nano Banana Pro API |
| Queue | Celery + Redis |
