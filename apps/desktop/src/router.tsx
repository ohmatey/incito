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
import { RunsPage } from '@/routes/RunsPage'
import { RunsEmptyState } from '@/routes/RunsEmptyState'
import { RunDetailPage } from '@/routes/RunDetailPage'
import { CustomRunPage } from '@/routes/CustomRunPage'
import { GradersPage } from '@/routes/GradersPage'
import { GradersEmptyState } from '@/routes/GradersEmptyState'
import { GraderDetail } from '@/routes/GraderDetail'
import { PlaybooksPage } from '@/routes/PlaybooksPage'
import { PlaybooksEmptyState } from '@/routes/PlaybooksEmptyState'
import { PlaybookDetail } from '@/routes/PlaybookDetail'
import { TagsPage } from '@/routes/TagsPage'
import { TagsEmptyState } from '@/routes/TagsEmptyState'
import { TagDetailPage } from '@/routes/TagDetailPage'
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

// Tags route with optional child for selected tag
const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagsPage,
})

// Index route for tags (no tag selected)
const tagsIndexRoute = createRoute({
  getParentRoute: () => tagsRoute,
  path: '/',
  component: TagsEmptyState,
})

// Tag detail route
const tagDetailRoute = createRoute({
  getParentRoute: () => tagsRoute,
  path: '/$tagId',
  component: TagDetailPage,
})

// Runs route with optional child for selected run
const runsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/runs',
  component: RunsPage,
})

// Index route for runs (no run selected)
const runsIndexRoute = createRoute({
  getParentRoute: () => runsRoute,
  path: '/',
  component: RunsEmptyState,
})

// Custom run route (create new run from scratch or existing prompt)
const customRunRoute = createRoute({
  getParentRoute: () => runsRoute,
  path: '/new',
  component: CustomRunPage,
  validateSearch: (search: Record<string, unknown>) => ({
    base: typeof search.base === 'string' ? search.base : undefined,
  }),
})

// Run detail route
const runDetailRoute = createRoute({
  getParentRoute: () => runsRoute,
  path: '/$runId',
  component: RunDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    variable: typeof search.variable === 'string' ? search.variable : undefined,
    collapsed: search.collapsed === true || search.collapsed === 'true',
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
})

// Graders route with optional child for selected grader
const gradersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/graders',
  component: GradersPage,
})

// Index route for graders (no grader selected)
const gradersIndexRoute = createRoute({
  getParentRoute: () => gradersRoute,
  path: '/',
  component: GradersEmptyState,
})

const graderDetailRoute = createRoute({
  getParentRoute: () => gradersRoute,
  path: '/$graderId',
  component: GraderDetail,
})

// Playbooks route with optional child for selected playbook
const playbooksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playbooks',
  component: PlaybooksPage,
})

// Index route for playbooks (no playbook selected)
const playbooksIndexRoute = createRoute({
  getParentRoute: () => playbooksRoute,
  path: '/',
  component: PlaybooksEmptyState,
})

const playbookDetailRoute = createRoute({
  getParentRoute: () => playbooksRoute,
  path: '/$playbookId',
  component: PlaybookDetail,
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
  gradersRoute.addChildren([gradersIndexRoute, graderDetailRoute]),
  playbooksRoute.addChildren([playbooksIndexRoute, playbookDetailRoute]),
  runsRoute.addChildren([runsIndexRoute, customRunRoute, runDetailRoute]),
  tagsRoute.addChildren([tagsIndexRoute, tagDetailRoute]),
  searchRoute,
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
