import { useMemo, useEffect } from 'react';

export default function BlobImage(props) {
  const { srcObject, ...remaining } = props;
  const url = useMemo(() => URL.createObjectURL(srcObject), [ srcObject ]);
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ url ]);
  // eslint-disable-next-line
  return <img src={url} {...remaining} />;
}
