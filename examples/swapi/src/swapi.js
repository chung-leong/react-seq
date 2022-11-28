const baseURL = 'https://swapi.dev/api/';

export function trimURL(url) {
  return url.substr(baseURL.length - 1);
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
    throw new HTTPError(res.status, res.statusText);
  }
  return res.json();
}

class HTTPError extends Error {
  constructor(status, statusText) {
    super(`${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
  }
}
