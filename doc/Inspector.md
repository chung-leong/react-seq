# Inspector

React-seq inspector base class

## Methods

* `onEvent` - Handle events. Default implementation does nothing.
* `onError` - Handle errors that occur in the inspector itself. Default implementation dump errors into the
development console.

## Event types

### 'await'

When the code starts awaiting a promise.

### 'fulfill'

When a promise of the event manager is fulfilled.

### 'reject'

When a promise of the event manager is rejected.

### 'state'

When a new state is returned.

### 'content'

When new content is rendered.

### 'error'

When an error occurs.

### 'abort'

When the generator aborts.

### 'timeout'

When a timeout occurs. Only happens during SSR.

### 'return'

When the generator returns.
