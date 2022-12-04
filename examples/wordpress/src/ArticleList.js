import { useRef, useEffect } from 'react';
import { useProgressive } from 'react-seq';
import { useWordPressPosts } from './wordpress.js';

export default function ArticleList() {
  const wp = useWordPressPosts();
  return useProgressive(async ({ fallback, type, usable, manageEvents, signal }) => {
    type(ArticleListUI);
    fallback(<div className="loading">Loading...</div>)
    usable(0);
    usable({ articles: 1 });
    const [ on, eventual ] = manageEvents();
    const {
      fetchAll,
      fetchAuthors,
      fetchCategories,
      fetchTags,
      fetchFeaturedMedia,
    } = wp;
    const options = { signal };
    const articles = fetchAll(() => eventual.needForMore, options);
    const authors = fetchAuthors(articles, options);
    const categories = fetchCategories(articles, options);
    const tags = fetchTags(articles, options);
    const media = fetchFeaturedMedia(articles, options);
    return { articles, authors, categories, tags, media, onBottomReached: on.needForMore };
  }, [ wp ]);
}

function ArticleListUI({ articles = [], authors = [], categories = [], tags = [], media = [], onBottomReached }) {
  const bottom = useRef();
  useEffect(() => {
    const observer = new IntersectionObserver(onBottomReached, {
      rootMargin: '0px 0px 1000px 0px',
      threshold: 0
    });
    observer.observe(bottom.current);
    return () => {
      observer.disconnect();
    };
  }, [ onBottomReached ]);
  const { length, total } = articles;
  return (
    <ul className="ArticleList">
      <div className="count">{length} of {total} articles</div>
      {articles.map((article) => {
        const props = {
          key: article.id,
          article,
          authors: authors.filter(a => article.authors.includes(a.id)),
          categories: categories.filter(c => article.categories.includes(c.id)),
          tags: tags.filter(t => article.tags.includes(t.id)),
          media: article.featured && media.find(m => article.featured_media === m.id),
        };
        return <ArticleUI {...props} />
      })}
      <div ref={bottom} className="bottom"></div>
    </ul>
  );
}

function ArticleUI({ article, authors, categories, tags, media }) {
  return (
    <li>
      <h2 className="title">
        <div className="categories">
          {categories.map(c => <span key={c.id}><Content value={c.name} /></span>)}
        </div>
        <a href={article.link} target="_blank" rel="noreferrer">
          <Content value={article.title} />
        </a>
      </h2>
      <p className="excerpt">
        <Media media={media} />
        <Content value={article.excerpt} />
      </p>
      <div className="authors">
        {authors.map(a => <span key={a.id}><Content value={a.name} /></span>)}
      </div>
      <div className="tags">
        {tags.map(t => <span key={t.id}><Content value={t.name} /></span>)}
      </div>
    </li>
  );
}

function Media({ media }){
  if (!media) {
    return null;
  }
  const url = new URL(media.source_url);
  url.searchParams.set('h', 75);
  return <img className="media" src={url} alt={media.alt_text} />;
}

function Content({ value }) {
  if (value instanceof Object && 'rendered' in value) {
    value = value.rendered;
  }
  const html = { __html: value };
  return <span dangerouslySetInnerHTML={html} />;
}
