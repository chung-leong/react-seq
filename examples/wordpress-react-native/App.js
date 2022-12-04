import { WordPressContext } from './wordpress.js'
import ArticleList from './ArticleList.js';

export default function App() {
  return (
    <WordPressContext.Provider value="https://techcrunch.com/wp-json/">
      <ArticleList />
    </WordPressContext.Provider>
  );
}
