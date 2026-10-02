const workerNamePattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Validate the staging target before building or publishing; never infer a remote target. */
export function getStagingTarget(env = process.env) {
  const staging = env.CLOUDFLARE_WORKER_STAGING;
  const production = env.CLOUDFLARE_WORKER_PRODUCTION;
  const subdomain = env.CLOUDFLARE_WORKERS_SUBDOMAIN;
  if (!staging || !production || !workerNamePattern.test(staging) || !workerNamePattern.test(production)) {
    throw new Error('Staging target requires valid CLOUDFLARE_WORKER_STAGING and CLOUDFLARE_WORKER_PRODUCTION names');
  }
  if (staging === production) {
    throw new Error('Staging Worker must differ from the production Worker');
  }
  if (!subdomain || !workerNamePattern.test(subdomain)) {
    throw new Error('Staging target requires CLOUDFLARE_WORKERS_SUBDOMAIN');
  }
  const url = `https://${staging}.${subdomain}.workers.dev`;
  if (env.STAGING_URL !== url) {
    throw new Error('STAGING_URL must match the staging Worker and account workers.dev subdomain without a trailing slash');
  }
  return { name: staging, url };
}
