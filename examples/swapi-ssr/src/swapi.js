const location = typeof(window) === 'object' ? window.location : global.location;
const dev = (process.env.NODE_ENV === 'development');
const baseURL = new URL('/api/', (dev) ? 'http://localhost:8080' : location.href);

export function trimURL(url) {
  return url.substr(baseURL.href.length - 1);
}

export async function fetchOne(url, options) {
  const absURL = (new URL(url, baseURL)).toString();
  return fetchJSON(absURL, options);
}

export async function* fetchList(url, options) {
  let absURL = (new URL(url, baseURL)).toString();
  do {
    const { results, next } = await fetchJSON(absURL, options);
    yield results.values();
    absURL = next;
  } while (absURL);
}

export function* fetchMultiple(urls, options) {
  for (const url of urls) {
    yield fetchOne(url, options);
  }
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (res.status !== 200) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}
