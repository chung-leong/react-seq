export default function Content({ value }) {
  if (value instanceof Object && 'rendered' in value) {
    value = value.rendered;
  }
  const html = { __html: value };
  return <span dangerouslySetInnerHTML={html} />;
}
