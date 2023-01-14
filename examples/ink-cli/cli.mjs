import { createElement } from 'react';
import { useSequential } from 'react-seq';
import { render } from 'ink';
import main from 'main.jsx';

render(createElement(() => useSequential(main, [])));
