import { createElement, Component } from 'react';
import { render, Text } from 'ink';
import { useSequential } from 'react-seq';

function App() {
	return useSequential(async (methods) => {
		const { wrap, reject, fallback } = methods;
		fallback(createElement(Text, {}, ''));
		wrap(children => createElement(ErrorBoundary, { onError: reject }, children));
		const { default: main } = await import('./main.jsx');
		return main(methods);
	});
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, fresh: false };
  }

  static getDerivedStateFromProps(props, state) {
    const { error, fresh } = state;
    if (fresh) {
      return { error, fresh: false };
    } else {
      return { error: null };
    }
  }

  static getDerivedStateFromError(error) {
    return { error, fresh: true };
  }

  render() {
    let { error } = this.state;
    if (error) {
      this.props.onError(error);
    }
    return !error ? this.props.children : null;
  }
}

render(createElement(App));
