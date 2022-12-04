import { StyleSheet, StatusBar } from 'react-native';

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
    backgroundColor: '#fff',
  },
  topBar: {
    color: '#fff',
    backgroundColor: '#000',
    textAlign: 'center',
    paddingTop: 2,
    paddingBottom: 2,
  },
  articleList: {

  },
  article: {
    padding: 10,
    marginHorizontal: 4,
    marginVertical: 8,
  },
  categories: {
    flexDirection: 'row',
    paddingBottom: 2,
    justifyContent: 'flex-end'
  },
  category: {
    fontSize: 12,
    paddingLeft: 2,
    paddingRight: 2,
    marginLeft: 4,
    backgroundColor: '#eee',
  },
  title: {
    fontSize: 20,
    marginBottom: 4,
  },
  excerpt: {
    marginBottom: 2,
  },
  authors: {
    flexDirection: 'row',
    paddingBottom: 2,
    justifyContent: 'flex-end'
  },
  author: {
  },
  tags: {
    flexDirection: 'row',
  },
  tag: {
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 6,
    paddingRight: 6,
    marginRight: 4,
    backgroundColor: '#933',
    color: '#fff',
    borderRadius: 12,
  },
  tagLabel: {
    fontSize: 10,
    backgroundColor: '#933',
    color: '#fff',
  },
});

export default styles;
