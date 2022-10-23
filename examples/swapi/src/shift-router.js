import { useMemo, useEffect, useContext, useReducer, createContext, Component } from 'react';

const RouterContext = createContext();

export function useRouter(options = {}) {
  let context = useContext(RouterContext);
  const atRootLevel = !context;
  if (atRootLevel) {
    const {
      initialURL = window.location.href,
      basePath = '/',
      allowExtra = true,
    } = options;
    // the state of the router
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [ { url, error, methods }, dispatch ] = useReducer((prev, next) => {
      return { ...prev, ...next };
    }, { url: initialURL, error: null, methods: {} });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    context = useMemo(() => {
      // store functions in methods so event handlers installed by
      // useEffect() can access them
      methods.set = set;
      methods.change = change;
      methods.match = match;

      class ErrorBoundary extends Component {
        constructor(props) {
          super(props);
          this.state = { error: null };
        }
        static getDerivedStateFromError(error) {
          // inform the hook that an error has occurred
          dispatch({ error });
          return { error };
        }
        render() {
          return !this.state.error ? this.props.children : null;
        }
      }

      function Router({ children }) {
        return (
          <RouterContext.Provider value={ctx}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </RouterContext.Provider>
        );
      }

      function set(targetURL) {
        dispatch({ url: targetURL, error: null });
      }

      function change(targetURL, replace = false) {
        if (match(targetURL)) {
          set(targetURL);
          if (replace) {
            window.history.replaceState({}, '', targetURL);
          } else {
            window.history.pushState({}, '', targetURL);
          }
        } else {
          window.location = targetURL;
        }
      }

      function match(targetURL) {
        const { origin: targetOrigin, pathname } = new URL(url, targetURL);
        return targetOrigin === origin && pathname.startsWith(basePath);
      }

      const { origin, pathname, searchParams } = new URL(url);
      if (!pathname.startsWith(basePath)) {
        throw new RouteError(pathname);
      }
      // place search variables into an object
      const query = {};
      for (const [ name, value ] of searchParams) {
        if (name.endsWith('[]')) {
          // an array of values is expected
          const aname = name.substr(name, name.length - 2);
          let array = query[aname];
          if (!array) {
            array = query[aname] = [];
          }
          array.push(value);
        } else {
          query[name] = value;
        }
      }
      const consumableParts = pathname.substr(basePath.length).split('/');
      if (consumableParts.length > 1 && !consumableParts[consumableParts.length - 1]) {
        consumableParts.pop();
      }
      const ctx = { consumableParts, error, url, pathname, change, query, Router };
      return ctx;
    }, [ basePath, url, error, methods ]);
    if (typeof(window) === 'object') {
      // add handlers for click and popstate events
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        const { set, change, match } = methods;
        const onLinkClick = (evt) => {
          const { target, button, defaultPrevented } = evt;
          if (button === 0 && !defaultPrevented) {
            // look for A tag with href
            let link = target;
            while (link && (link.tagName !== 'A' || !link.href)) {
              link = link.parentNode;
            }
            if (link && !link.target && !link.download) {
              if (match(link.href)) {
                change(link.href);
                evt.preventDefault();
                evt.stopPropagation();
              }
            }
          }
        };
        const onPopState = (evt) => {
          set(window.location.href);
          evt.preventDefault();
          evt.stopPropagation();
        };
        window.addEventListener('click', onLinkClick);
        window.addEventListener('popstate', onPopState);
        return () => {
          window.removeEventListener('click', onLinkClick);
          window.removeEventListener('popstate', onPopState);
        };
      }, [ methods ]);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (!allowExtra) {
          if (!context.error && context.consumableParts.length > 0) {
            dispatch({ error: new RouteError(context.pathname) });
          }
        }
      }, [ allowExtra, context ]);
    }
  } // end atRootLevel
  // grab properties set up by root level call to hook
  const { consumableParts, error, url, pathname, query, change, Router } = context;
  let consuming = false;
  // keep a copy of the list of parts
  const originalParts = useMemo(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    consuming = true;
    return consumableParts.slice();
  }, [ consumableParts ]);
  // modify the array within the context when the context is first created
  // then use a copy in subsequent updates
  const parts = (consuming) ? consumableParts : originalParts.slice();
  const shift = (fn = null, options = {}) => {
    // throw error received from error boundary
    if (error) {
      throw error;
    }
    const {
      empty = false,
      last = false,
    } = options;
    let value, failed = false;
    if (parts.length > 0) {
      value = parts.shift();
      if (fn) {
        value = fn(value);
        if (value === undefined || isNaN(value)) {
          failed = true;
        }
      }
    } else {
      failed = !empty;
    }
    if (last && parts.length !== 0) {
      failed = true;
    }
    if (failed) {
      throw new RouteError(pathname);
    }
    return value;
  };
  // send RouterByPass instead of Router when a router has already been set up at
  // a higher level
  return { change, shift, url, query, parts, Router: (atRootLevel) ? Router : RouterByPass };
}

export function RouterByPass({ children }) {
  return children;
}

export class RouteError extends Error {
  constructor(pathname) {
    super(`Page not found: ${pathname}`);
    this.pathname = pathname;
    this.status = 404;
    this.statusText = 'Not Found';
  }
}
