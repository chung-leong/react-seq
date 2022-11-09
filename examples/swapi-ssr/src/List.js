import { trimURL } from './swapi.js';

export default function List({ urls, items, field = 'name' }) {
  if (typeof(urls) === 'string') {
    // allow the passing of a single url and item
    urls = [ urls ];
    items = (items) ? [ items ] : [];
  } else if (!urls) {
    // get the URLs from the items themselves
    urls = items ? items.map(i => i.url) : [];
  }
  if (urls.length > 0) {
    return <ul>{urls.map(renderItem)}</ul>;
  } else {
    return <ul className="empty"><li><span>none</span></li></ul>;
  }

  function renderItem(url, i) {
    const item = (items) ? items.find(i => i.url === url) : null;
    const text = (item) ? item[field] : '...';
    const className = (item) ? undefined : 'pending';
    const href = trimURL(url);
    return (
      <li key={i}>
        <a href={href} className={className}>{text}</a>
      </li>
    );
  }
}
