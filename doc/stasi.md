# stasi(generator) <sup>async generator</sup>

Create an async generator that yields values from another generator

## Syntax

```js
function ArticleList() {
  return useProgressive(async ({ type }) => {
    type(ArticeListUI);
    // fetchArticle() returns an async generator
    const articles = fetchArticle();  
    // fetchAuthors() returns an async generator while
    // expecting itself an async generator as a parameter
    const authors = fetchAuthors(stasi(articles));
    return { articles, authors };
  })
}
```

## Parameters

* `generator` - `<AsyncGenerator>` Target generator to obtain values from

## Notes

`stasi` is designed for situations where a generator has a cross-dependency on another async generator. In the example
above, `articles` is the main content, while records of these articles' authors are also expected. `fetchAuthors`
needs to know the author ids, but those aren't available until the articles are loaded, a task performed by the
other generator. `stasi` solves this dilemma by basically creating a shadow copy of the given async generator. Doing
so allows  `fetchAuthors` to obtain the information it needs without impacting the normal operation of the source
generator.

Any error emitted by the source generator will be ignored. Shadow generators created by `stasi` will simply end in
such a situation.

`stasi` should not be used in an async generator function, since its code would start running when the first item is
retrieved from the generator and not when the function is called. By then some items could have been removed from
the target already.

Instead of doing this:

```js
// async generator function
async function* fetchAuthors(articleGenerator) {
  for await (const article of stasi(articleGenerator)) {
    /* ... */
  }
}
```

Do this:

```js
// function returning an async generator
function fetchAuthors(articleGenerator) {
  articleGenerator = stasi(articleGenerator);
  async function *generate() {
    for await (const article of articleGenerator) {
      /* ...*/
    }
  }
  return generate();
}
```

Or leave it to the caller to call `stasi`.
