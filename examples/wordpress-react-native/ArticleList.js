import { useRef, useEffect } from 'react';
import { useProgressive } from 'react-seq';
import { View, Text, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import HTML from "react-native-render-html";
import { useWordPressPosts } from './wordpress.js';
import styles from './styles.js';

export default function ArticleList() {
  const wp = useWordPressPosts();
  return useProgressive(async ({ fallback, type, usable, manageEvents, signal }) => {
    type(ArticleListUI);
    fallback(<ActivityIndicator size="large" />);
    usable(0);
    usable({ articles: 1 });
    const [ on, eventual ] = manageEvents();
    const {
      fetchAll,
      fetchAuthors,
      fetchCategories,
      fetchTags,
    } = wp;
    const options = { signal };
    const articles = fetchAll(() => eventual.needForMore, options);
    const authors = fetchAuthors(articles, options);
    const categories = fetchCategories(articles, options);
    const tags = fetchTags(articles, options);
    return { articles, authors, categories, tags, onBottomReached: on.needForMore };
  }, [ wp ]);
}

function ArticleListUI({ articles = [], authors = [], categories = [], tags = [], onBottomReached }) {
  const { length, total } = articles;
  const listProps = {
    data: articles,
    styles: styles.articleList,
    onEndReached: onBottomReached,
    onEndReachedThreshold: 0.25,
    renderItem: ({ item: article }) => {
      const props = {
        key: article.id,
        article,
        authors: authors.filter(a => article.authors.includes(a.id)),
        categories: categories.filter(c => article.categories.includes(c.id)),
        tags: tags.filter(t => article.tags.includes(t.id)),
      };
      return <ArticleUI {...props} />;
    },
  };
  return (
    <SafeAreaView styles={styles.container}>
      <View styles={[ styles.topBar ]}>
        <Text>{length} of {total} articles</Text>
      </View>
      <FlatList {...listProps} />
    </SafeAreaView>
  );
}

function ArticleUI({ article, authors, categories, tags }) {
  return (
    <View styles={styles.article}>
      <View>
        {categories.map(c => <Content key={c.id} value={c.name} />)}
      </View>
      <View>
        <Content value={article.title} />
      </View>
      <View>
        <Content value={article.excerpt} />
      </View>
      <View>
        {authors.map(a => <Content key={a.id} value={a.name} />)}
      </View>
      <View>
        {tags.map(t => <Content key={t.id} value={t.name} />)}
      </View>
    </View>
  );
}

function Content({ value }) {
  if (value instanceof Object && 'rendered' in value) {
    value = value.rendered;
  }
  return <HTML source={{ html: value }} />;
}
