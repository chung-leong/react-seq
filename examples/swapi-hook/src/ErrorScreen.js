import unicorn from './unicorn.svg';

export default function ErrorScreen({ error }) {
  if (error.status === 404) {
    return (
      <div className="Error">
        <img src={unicorn} alt="Unicorn" />
        <h2>The page you're trying to reach does not exist. But then again, who does?</h2>
      </div>
    );
  } else {
    return (
      <div className="Error">
        <h2>{error.message}</h2>
      </div>
    );
  }
}
