const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const environment = {
  appEnvironment: 'selfhost' as const,
  production: true,
  mediaProviderMode: 'local' as const,
  apiUrl: '/api',
  socketUrl: browserOrigin,
};
