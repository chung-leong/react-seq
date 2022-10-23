import { RouteError } from './shift-router.js';

export default function ErrorDisplay({ error }) {
  let message;
  if (error instanceof RouteError) {
    message = 'The page you\'re trying to reach does not exist. But then again, who does?';
  } else {
    message = error.message;
  }
  return (
    <div>
      <h1 className="error">{message}</h1>
    </div>
  );
}
