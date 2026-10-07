export type ApprovedSection = '/blog' | '/projects';
export type LegacyRoute =
  | { from: string; kind: 'neutral'; section: ApprovedSection | '/' }
  | { from: string; kind: 'redirect'; to: ApprovedSection };

export const legacyRoutes: readonly LegacyRoute[] = [
  { from: '/thoughts', kind: 'redirect', to: '/blog' },
  { from: '/thoughts/friends-reunion', kind: 'neutral', section: '/blog' },
  { from: '/thoughts/listenhub-embed', kind: 'neutral', section: '/blog' },
  { from: '/thoughts/oppenheimer-cast', kind: 'neutral', section: '/blog' },
  { from: '/thoughts/read-me', kind: 'neutral', section: '/blog' },
  { from: '/thoughts/reading-outline', kind: 'neutral', section: '/blog' },
  { from: '/thoughts/spring-visit', kind: 'neutral', section: '/blog' },
  { from: '/thoughts/webpage-as-room', kind: 'neutral', section: '/blog' },
  { from: '/ai-works', kind: 'redirect', to: '/projects' },
  { from: '/ai-works/first-experiment', kind: 'neutral', section: '/projects' },
  { from: '/about/me', kind: 'neutral', section: '/' },
];
