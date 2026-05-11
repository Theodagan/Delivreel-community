const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const environment = {
  appEnvironment: 'dev' as const,
  production: false,
  mediaProviderMode: 'auto' as const,
  apiUrl: '/api',
  socketUrl: browserOrigin,
};
