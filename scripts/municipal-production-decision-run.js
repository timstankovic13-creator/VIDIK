async function fetchText(url, fetchImpl = globalThis.fetch) {
  const safe = assertOfficialUrl(url);
  if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
  let current = safe;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetchImpl(current, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'accept-language': 'en-CA,en;q=0.9',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers?.get?.('location') || response.headers?.get?.('Location');
      if (!location) throw new Error(`upstream-redirect-missing-location:${current}`);
      current = assertOfficialUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`upstream-http:${response.status}:${current}`);
    return { text: await response.text(), finalUrl: current, status: response.status };
  }
  throw new Error(`upstream-too-many-redirects:${safe}`);
}
