import { useContext, createContext } from 'react';
import { stasi } from 'react-seq';

export const WordPressContext = createContext();

export function useWordPressBase() {
  const baseURL = useContext(WordPressContext);
  if (!baseURL) {
    throw new Error('No WordPress context found');
  }

  function fetchObjectsContinual(path, demand, options) {
    async function* generate() {
      let page = 0;
      for (;;) {
        const list = await fetchObjectsByPage(path, ++page, options);
        const pageCount = list.pages;
        generator.total = list.total;
        yield list.values();
        if (page >= pageCount) {
          break;
        }
        await demand();
      }
    }
    const generator = generate();
    return generator;
  }

  function fetchObjectComponents(path, field, generator, options) {
    generator = stasi(generator);
    async function *generate() {
      const fetched = {};
      for await (const objects of generator) {
        const fetching = [];
        for (const object of objects) {
          const ids = typeof(field) === 'function' ? field(object) : object[field];
          // see which ones haven't been fetched yet
          for (const id of ids) {
            if (!fetched[id]) {
              fetching.push(id);
              fetched[id] = true;
            }
          }
        }
        if (fetching.length > 0) {
          // some are still missing
          const components = await fetchObjectsByIds(path, fetching, options);
          yield components.values();
        }
      }
    }
    return generate();
  }

  async function fetchObjectsByIds(path, ids, options) {
    const url = new URL(path, baseURL);
    const { searchParams } = url;
    for (const id of ids) {
      searchParams.append('include[]', id);
    }
    return fetchArray(url, options);
  }

  async function fetchObjectsByPage(path, page, options) {
    const url = new URL(path, baseURL);
    const { searchParams } = url;
    searchParams.append('page', page);
    return fetchArray(url, options);
  }

  async function fetchArray(url, options) {
    const res = await fetch(url, options);
    if (res.status !== 200) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const array = await res.json();
    if (!(array instanceof Array)) {
      throw new Error(`Not an array`);
    }
    array.total = parseInt(res.headers.get('X-WP-Total'));
    array.pages = parseInt(res.headers.get('X-WP-TotalPages'));
    return array;
  }

  return {
    fetchObjectsContinual,
    fetchObjectComponents,
    fetchObjectsByIds,
    fetchObjectsByPage,
    fetchArray,
  };
}

export function useWordPressPosts() {
  const {
    fetchObjectsContinual,
    fetchObjectComponents,
  } = useWordPressBase();

  function fetchAll(demand, options) {
    return fetchObjectsContinual('wp/v2/posts', demand, options);
  }

  function fetchAuthors(generator, options) {
    return fetchObjectComponents('wp/v2/users', 'authors', generator, options);
  }

  function fetchCategories(generator, options) {
    return fetchObjectComponents('wp/v2/categories', 'categories', generator, options);
  }

  function fetchTags(generator, options) {
    return fetchObjectComponents('wp/v2/tags', 'tags', generator, options);
  }

  function fetchFeaturedMedia(generator, options)  {
    const mediaId = p => p.featured ? [ p.featured_media ] : [];
    return fetchObjectComponents('wp/v2/media', mediaId, generator, options);
  }

  return {
    fetchAll,
    fetchAuthors,
    fetchCategories,
    fetchTags,
    fetchFeaturedMedia,
  };
}
