console.log('crappy polyfill');

global.fetch = (url) => {
  console.log(url);
  return Promise.reject(new Error('This function is fake'));
}
