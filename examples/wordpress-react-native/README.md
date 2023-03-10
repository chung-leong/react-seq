# WordPress React Native example

In this example, we're going to create a simple [React Native](https://reactnative.dev/) app based on the earlier
[WordPress example](../wordpress/README.md#readme). The main motivation is to show that React-seq works on that platform.

Disclaimer: I'm a novice at React Native. The code shown here might not conform to best practices. If you see any
shortcoming, please leave a comment in on the [discussion board](https://github.com/chung-leong/react-seq/discussions).

I've also only tested it on an iPhone. If you're an owner of an Android phone, I'd love to hear about your
experience.

## Seeing the code in action

To run the example, you'll need to install [Expo Go](https://expo.dev/client) on your mobile device.

Go to the `examples/wordpress` folder. Run `npm install` then `npm start`. A QR-Code will appear on screen:

![screenshot](./img/screenshot-2.jpg)

If you have an iPhone, scan the QR-code using the Camera app and follow the link. If you have an Android phone, scan
the code using Expo GO.

The example app should appear after some time:

![screenshot](./img/screenshot-1.jpg)

## Article list, the asynchronous part

This component is largely the same as [the original](../wordpress/src/ArticleList.js):

```js
export default function ArticleList() {
  const wp = useWordPressPosts();
  return useProgressive(async ({ fallback, type, defer, manageEvents, signal }) => {
    type(ArticleListUI);
    fallback(<ArticleLoading />);
    defer(200);
    usable({ articles: 1, categories: 1 });
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
```

Small adjustments were made to make pop-ins less noticeable.

## Article list, the synchronous part

This component is very different. We use [`FlatList`](https://reactnative.dev/docs/flatlist) to display the article
list. It expects an array of objects and a function for rendering each of them:

```js
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
```

Happily `FlatList` has an `onEndReached` props, which is a perfect match for our `onBottomReached` handler. We
configure it to fire whenever we're within two screens of the bottom.

## Article control

`ArticleUI` is structurally similar to [the original](../wordpress/src/ArticleList.js#L62). HTML tags were basically
swapped out for their React Native equivalent:

```js
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
```

Various small changes had to be made due to the absence of functionalities offered by a browser. Over all it's a
fairly straight forward process. 90% of development time was spent on reworking and tweaking the page layout.

## Final thoughts

Yay, it works! Zero problem was encountered using React-seq in React Native. The example app is rather simple, with
just a single screen. A more sophisticated example involving navigation between different screens is in the plan.
Stay tuned!
