import { useMemo, useEffect } from 'react';

export default function BlobAudio(props) {
  const { srcObject, ...remaining } = props;
  const url = useMemo(() => URL.createObjectURL(srcObject), [ srcObject ]);
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ url ]);
  return <audio src={url} {...remaining} />;
}
