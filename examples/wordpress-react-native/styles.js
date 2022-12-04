import { StyleSheet, StatusBar } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
    backgroundColor: '#fff',
  },
  topBar: {
    color: '#fff',
    backgroundColor: '#000',
  },
  articleList: {

  },
  article: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
});

export default styles;
