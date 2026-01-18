import {
  createRouter,
  createRootRoute,
  createRoute,
  createHashHistory,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from '@/layouts/RootLayout'
import { PromptsPage } from '@/routes/PromptsPage'
import { PromptsEmptyState } from '@/routes/PromptsEmptyState'
import { PromptDetail } from '@/routes/PromptDetail'
import { SearchPage } from '@/routes/SearchPage'
import { TagsPage } from '@/routes/TagsPage'
import { SettingsPage } from '@/routes/SettingsPage'

// Create root route with layout
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Index route - redirect to prompts
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/prompts' })
  },
})

// Prompts route with optional child for selected prompt
const promptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prompts',
  component: PromptsPage,
})

// Index route for prompts (no prompt selected)
const promptsIndexRoute = createRoute({
  getParentRoute: () => promptsRoute,
  path: '/',
  component: PromptsEmptyState,
})

const promptDetailRoute = createRoute({
  getParentRoute: () => promptsRoute,
  path: '/$promptId',
  component: PromptDetail,
})

// Search route
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: SearchPage,
})

// Tags route
const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagsPage,
})

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  promptsRoute.addChildren([promptsIndexRoute, promptDetailRoute]),
  searchRoute,
  tagsRoute,
  settingsRoute,
])

// Create hash history for Tauri file:// protocol compatibility
const hashHistory = createHashHistory()

// Create and export router
export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: 'intent',
})

// Register router types for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
