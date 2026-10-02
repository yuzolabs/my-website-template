import { defineConfig } from 'cf/config';
import { getStagingTarget } from './scripts/staging-target.mjs';

export default defineConfig(({ mode }) => {
  if (mode !== 'development' && mode !== 'staging') {
    throw new Error('Cloudflare configuration requires --mode development or --mode staging; production is not configured');
  }
  return {
    worker: {
      name: mode === 'staging' ? getStagingTarget().name : 'website-template-local',
      compatibilityDate: '2026-09-25',
      workersDev: mode === 'staging',
      previewUrls: false,
      assets: { notFoundHandling: '404-page' },
    },
  };
});
