import axios from 'axios';

/**
 * Adds the internal service key to every call this service makes to the ATS and
 * AI services. The key is only added for those two hosts, never for anything else.
 */
const targets = () =>
  [process.env.ATS_SERVICE_URL || 'http://localhost:8003', process.env.AI_SERVICE_URL || 'http://localhost:8001'];

axios.interceptors.request.use((config) => {
  const url = String(config.url || '');
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (key && targets().some((t) => url.startsWith(t))) {
    config.headers.set('x-service-key', key);
  }
  return config;
});
