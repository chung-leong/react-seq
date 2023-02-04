type SequentialMethods = { 
  defer: (ms: number) => void,
  fallback: (element: JSX.Element | (() => JSX.Element)) => void,
  flush: (use: boolean) => void,
  manageEvents: () => [ Proxy, Proxy ],
  mount: () => Promise<void>,
  reject: (err: Error) => void,
  signal: AbortSignal,
  suspend: (key?: string) => void,
  unsuspend: (fn: () => void) => void,
  wrap: (fn: (child: JSX.Element) => JSX.Element) => void,
};
type SequentialGenerator = AsyncGenerator<Element | UseSequentialGenerator, undefined, void>;

export function useSequential(cb: (methods: SequentialMethods) => SequentialGenerator, deps: any[]): JSX.Element;
export function sequential(cb: (methods: SequentialMethods) => SequentialGenerator): { element: JSX.Element, abortManager: AbortManager };

type UsabilitySpec = number | ((prop: any, props: object) => boolean);
type ProgressiveMethods = SequentialMethods & {
  element: (fn: (props: object) => JSX.Element) => void,
  type: (type: JSX.ElementClass) => void,
  usable: (arg: UsabilitySpec | { [key]: UsabilitySpec }) => void,
};

export function useProgressive(cb: (methods: ProgressiveMethods) => Promise<object>, deps: any[]): JSX.Element;
export function progressive(cb: (methods: ProgressiveMethods) => Promise<object>): { element: JSX.Element, abortManager: AbortManager };

type SequentialStateMethods = {
  defer: (ms: number) => void,
  flush: (use: boolean) => void,
  initial: (value: any) => void,
  manageEvents: () => [ Proxy, Proxy ],
  mount: () => Promise<void>,
  reject: (err: Error) => void,
  signal: AbortSignal,
};
type SequentialStateGenerator = AsyncGenerator<Any | SequentialStateGenerator, undefined, void>;

export function useSequentialState(cb: (methods: SequentialStateMethods) => SequentialStateGenerator, deps: any[]): any;
export function sequentialState(cb: (methods: SequentialStateMethods) => SequentialStateGenerator, setState: (state: any) => void, setError: (err: Error) => void): { initialState: any, abortManager: AbortManager };

type ProgressiveStateMethods = SequentialStateMethods & {
  usable: (arg: UsabilitySpec | { [key]: UsabilitySpec }) => void,
};

export function useProgressiveState(cb: (methods: ProgressiveStateMethods) => Promise<object>, deps: any[]): object;
export function progressiveState(cb: (methods: ProgressiveStateMethods) => Promise<object>, setState: (state: any) => void, setError: (err: Error) => void): { initialState: any, abortManager: AbortManager };