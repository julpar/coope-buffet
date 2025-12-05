// Shared API base URL builder to avoid circular imports

type EnvShape = { VITE_SERVICE_URL_APP?: string; VITE_API_VERSION?: string };
const env = ((import.meta as unknown as { env?: EnvShape }).env) || {};
const SERVICE_URL_APP = (env.VITE_SERVICE_URL_APP || 'http://localhost:3000') as string;
const API_VERSION = (env.VITE_API_VERSION || 'v1') as string;

function buildBase(base: string, version: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedVer = version.replace(/^\//, '');
  return `${trimmedBase}/${trimmedVer}`;
}

export const API_BASE = buildBase(SERVICE_URL_APP, API_VERSION);
