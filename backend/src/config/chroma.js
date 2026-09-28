const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

/**
 * Placeholder ChromaDB Connection Checker.
 * Validates connectivity to ChromaDB instance via HTTP REST API.
 */
async function checkChromaConnection() {
  const baseUrl = CHROMA_URL.replace(/\/+$/, '');
  const endpoints = [`${baseUrl}/api/v2/heartbeat`, `${baseUrl}/api/v1/heartbeat`];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(endpoint, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'connected',
          endpoint,
          heartbeat: data
        };
      }
    } catch (e) {
      // try next endpoint
    }
  }

  return {
    status: 'disconnected',
    endpoint: `${baseUrl}/api/v2/heartbeat`,
    error: 'ChromaDB server is unreachable'
  };
}

module.exports = {
  checkChromaConnection,
  CHROMA_URL
};
