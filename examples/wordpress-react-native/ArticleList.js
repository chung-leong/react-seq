import { useRef, useEffect } from 'react';
import { useProgressive } from 'react-seq';
import { View, Text, FlatList, SafeAreaView, ActivityIndicator, TouchableHighlight, Linking } from 'react-native';
import { useWordPressPosts } from './wordpress.js';
import styles from './styles.js';

export default function ArticleList() {
  const wp = useWordPressPosts();
  return useProgressive(async ({ fallback, type, defer, usable, manageEvents, signal }) => {
    type(ArticleListUI);
    fallback(<ArticleLoading />);
    defer(100);
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

function ArticleLoading() {
  return (
    <SafeAreaView style={styles.loadingScreen}>
      <ActivityIndicator size="large" />
    </SafeAreaView>
  );
}

function ArticleListUI({ articles = [], authors = [], categories = [], tags = [], onBottomReached }) {
  const { length, total } = articles;
  const listProps = {
    data: articles,
    styles: styles.articleList,
    onEndReached: onBottomReached,
    onEndReachedThreshold: 2,
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.topBar}>{length} of {total} articles</Text>
      <FlatList {...listProps} />
    </SafeAreaView>
  );
}

function ArticleUI({ article, authors, categories, tags }) {
  const onTitlePress = () => Linking.openURL(article.link);
  return (
    <View style={styles.article}>
      <View style={styles.categories}>
        {categories.map(c => <Content key={c.id} style={styles.category} value={c.name} />)}
      </View>
      <TouchableHighlight underlayColor="#DDDDDD" onPress={onTitlePress}>
        <Content style={styles.title} value={article.title} />
      </TouchableHighlight>
      <Content style={styles.excerpt} value={article.excerpt} />
      <View style={styles.authors}>
        {authors.map(a => <Content key={a.id} style={styles.author} value={a.name} />)}
      </View>
      <View style={styles.tags}>
        {tags.map(t =>
          <View key={t.id} style={styles.tag}>
            <Content style={styles.tagLabel} value={t.name} />
          </View>
        )}
      </View>
    </View>
  );
}

function Content({ style, value }) {
  if (value instanceof Object && 'rendered' in value) {
    value = value.rendered;
  }
  value = decodeEntitieS(value.replace(/<.*?>/g, '').trim());
  return <Text style={style}>{value}</Text>;
}

const entities = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: '\'',
  hellip: '…',
};

function decodeEntitieS(s) {
  return s.replace(/&(.*?);/g, (m0, m1) => {
    if (m1.startsWith('#')) {
      const code = parseInt(m1.substr(1));
      return code ? String.fromCharCode(code) : '?';
    } else {
      return entities[m1] ?? '?';
    }
  });
}
