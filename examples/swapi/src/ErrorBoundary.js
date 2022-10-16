import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(err) {
    return { error: err };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return <h1 className="error">{error.message}</h1>;
    }
    return this.props.children;
  }
}
