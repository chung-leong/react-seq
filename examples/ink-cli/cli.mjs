import { createElement, Component } from 'react';
import { render, Text } from 'ink';
import { useSequential } from 'react-seq';

function App() {
	return useSequential(async (methods) => {
		const { fallback } = methods;
		fallback(createElement(Text, {}, ''));
		const { default: main } = await import('./main.jsx');
		return main(methods);
	});
}

render(createElement(App));
