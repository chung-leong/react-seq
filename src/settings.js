const currentSettings = {
  ssr: false,
  ssr_time_limit: 3000
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
      case 'ssr_time_limit':
        if (typeof(value) !== 'number') {
          throw new TypeError(`ssr_time_limit must be a number`);
        }
        break;
      default:
        throw new Error(`Unknown setting: ${value}`);
    }
  }
  for (const [ name, value ] of Object.entries(values)) {
    currentSettings[name] = value;
  }
}
