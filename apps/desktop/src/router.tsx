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
import { AgentsPage } from '@/routes/AgentsPage'
import { AgentsEmptyState } from '@/routes/AgentsEmptyState'
import { AgentDetail } from '@/routes/AgentDetail'
import { ResourcesPage } from '@/routes/ResourcesPage'
import { ResourcesEmptyState } from '@/routes/ResourcesEmptyState'
import { SearchPage } from '@/routes/SearchPage'
import { TagsPage } from '@/routes/TagsPage'
import { RunsPage } from '@/routes/RunsPage'
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

// Agents route with optional child for selected agent
const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents',
  component: AgentsPage,
})

// Index route for agents (no agent selected)
const agentsIndexRoute = createRoute({
  getParentRoute: () => agentsRoute,
  path: '/',
  component: AgentsEmptyState,
})

const agentDetailRoute = createRoute({
  getParentRoute: () => agentsRoute,
  path: '/$agentId',
  component: AgentDetail,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: search.edit === true || search.edit === 'true',
  }),
})

// Resources route
const resourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/resources',
  component: ResourcesPage,
})

// Index route for resources (no resource selected)
const resourcesIndexRoute = createRoute({
  getParentRoute: () => resourcesRoute,
  path: '/',
  component: ResourcesEmptyState,
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

// Runs route
const runsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/runs',
  component: RunsPage,
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
  agentsRoute.addChildren([agentsIndexRoute, agentDetailRoute]),
  resourcesRoute.addChildren([resourcesIndexRoute]),
  searchRoute,
  tagsRoute,
  runsRoute,
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
