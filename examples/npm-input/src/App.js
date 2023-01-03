import { useDeferredValue, useState, useEffect, useCallback, startTransition } from 'react';
import { useSequentialState, useProgressiveState } from 'react-seq';
import './css/App.css';

export default function App() {
  const [ search1, setSearch1 ] = useState('');
  const [ search2, setSearch2 ] = useState('');
  const [ search3, setSearch3 ] = useState('');
  const onChange1 = useCallback(evt => setSearch1(evt.target.value), []);
  const onChange2 = useCallback(evt => setSearch2(evt.target.value), []);
  const onChange3 = useCallback(evt => setSearch3(evt.target.value), []);
  const list1 = useNPMList1(search1);
  const list2 = useNPMList2(search2);
  const list3 = useNPMList3(search3);

  function createList(id, items) {
    return (
      <datalist id={id}>
        {items.map((v, i) => <option key={i} value={v} />)}
      </datalist>
    );
  }

  return (
    <div className="App">
      <div>
        <input list="list1" value={search1} onChange={onChange1} />
        {createList('list1', list1)}
      </div>
      <div>
        <input list="list2" value={search2} onChange={onChange2} />
        {createList('list2', list2)}
      </div>
      <div>
        <input list="list3" value={search3} onChange={onChange3} />
        {createList('list3', list3)}
      </div>
    </div>
  );
}

function useNPMList1(search) {
  const searchDeferred = useDeferredValue(search.trim());
  const [ list, setList ] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    fetchPackages(searchDeferred, { signal }).then((list) => {
      if (!signal.aborted) {
        startTransition(() => setList(list));
      }
    });
    return () => {
      controller.abort();
      setList([]);
    };
  }, [ searchDeferred ]);
  return list;
}

function useNPMList2(search) {
  const searchDeferred = useDeferredValue(search.trim());
  return useSequentialState(async function*({ signal }) {
    yield fetchPackages(searchDeferred, { signal });
  }, [ searchDeferred ]) ?? [];
}

function useNPMList3(search) {
  const searchDeferred = useDeferredValue(search.trim());
  const { list = [] } = useProgressiveState(async ({ signal }) => {
    return { list: fetchPackages(searchDeferred, { signal }) };
  }, [ searchDeferred ]);
  return list;
}

async function fetchPackages(text, options) {
  if (text) {
    try {
      const url = new URL('https://registry.npmjs.com/-/v1/search');
      url.searchParams.set('text', text);
      const res = await fetch(url, options);
      if (res.status === 200) {
        const json = await res.json();
        return json.objects.map(r => r.package.name);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  }
  return [];
}
