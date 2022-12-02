const currentSettings = {
  ssr: false,
  ssr_timeout: 3000,
  ssr_timeout_handler: null,
};

export function setting(name) {
  const value = currentSettings[name];
  if (value === undefined) {
    throw new Error(`Unknown setting: ${name}`);
  }
  return value;
}

export function settings(values) {
  if (values && typeof(values) !== 'object') {
    throw new TypeError(`Invalid argument`);
  }
  for (const [ name, value ] of Object.entries(values)) {
    switch (name) {
      case 'ssr':
        if (![ 'server', 'hydrate', false ].includes(value)) {
          throw new TypeError(`ssr must be either "server", "hydrate", or false`);
        }
        break;
      case 'ssr_timeout':
        if (typeof(value) !== 'number') {
          throw new TypeError(`ssr_timeout must be a number`);
        }
        break;
      case 'ssr_timeout_handler':
        if(value !== null && typeof(value) !== 'function') {
          throw new TypeError(`ssr_timeout_handler must be a function or null`);
        }
        break;
      default:
        throw new Error(`Unknown setting: ${name}`);
    }
  }
  for (const [ name, value ] of Object.entries(values)) {
    currentSettings[name] = value;
  }
}
