import { useCallback, useEffect } from 'react';
import { useMediaCapture } from './media-cap.js';
import { constrainSize } from './utils.js';
import BlobAudio from './BlobAudio.js';

export default function AudioDialogBox({ onClose, onCapture }) {
  const {
    status,
    capturedAudio,
    devices,
    duration,
    volume,
    selectedDeviceId,
    lastError,
    record,
    pause,
    resume,
    stop,
    clear,
    selectDevice,
  } = useMediaCapture({ video: false, watchVolume: true });
  const classNames = [ 'video-viewport', status ];
  const size = constrainSize(null, { width: 640, height: 240 });

  const onStart = useCallback(() => {
    const options = {
      audioMIMEType: 'audio/webm',
      audioBitsPerSecond: 128000,
    };
    record(options)
  }, [ record ]);
  const onPause = useCallback(() => pause(), [ pause ]);
  const onResume = useCallback(() => resume(), [ resume ]);
  const onStop = useCallback(() => stop(), [ stop ]);
  const onRetake = useCallback(() => clear(), [ clear ]);
  const onAccept = useCallback(() => onCapture(capturedAudio), [ onCapture, capturedAudio ]);

  useEffect(() => {
    if (lastError) {
      console.error(lastError);
    }
  }, [ lastError ])

  return (
    <div className="overlay">
      <div className="dialog-box video">
        <div className="title">
          Audio Recorder
          <i className="fa fa-window-close" onClick={onClose} />
        </div>
        <div className={classNames.join(' ')} style={size}>
          {(() => {
            switch(status) {
              case 'previewing':
              case 'recording':
              case 'paused':
              case 'acquiring':
                return (
                  <span className="fa-stack fa-lg">
                    <i className="fa fa-microphone fa-stack-1x" />
                  </span>
                );
              case 'denied':
                return (
                  <span className="fa-stack fa-lg">
                    <i className="fa fa-microphone fa-stack-1x" />
                    <i className="fa fa-ban fa-stack-2x" />
                  </span>
                );
              case 'recorded':
                return <BlobAudio srcObject={capturedAudio.blob}  controls />;
              default:
            }
          })()}
        </div>
        <div className="controls">
        {(() => {
          if (duration !== undefined) {
            const seconds = duration / 1000;
            const hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const mm = Math.floor(seconds / 60 % 60).toString().padStart(2, '0');
            const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
            return <div className="duration">{`${hh}:${mm}:${ss}`}</div>
          } else {
            if (!devices || devices.length <= 1) {
              return <div className="devices" />;
            } else {
              return (
                <div className="devices">
                  <select onChange={evt => selectDevice(evt.target.value)} value={selectedDeviceId}>
                    {
                      devices.map(({ label, id }) => {
                        label = label.replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/, '');
                        return <option value={id} key={id}>{label}</option>
                      })
                    }
                  </select>
                </div>
              );
            }
          }
        })()}
        {(() => {
          if (volume === undefined || status === 'recorded') {
            return <div className="volume" />;
          }
          const iconClassNames = [ 'fa' ];
          if (volume > 40) {
            iconClassNames.push('fa-volume-up');
          } else if (volume > 10) {
            iconClassNames.push('fa-volume-down');
          } else {
            iconClassNames.push('fa-volume-off');
          }
          const barClassNames = [ 'volume-bar', status ];
          const barStyle = { width: volume + '%' };
          return (
            <div className="volume">
              <i className={iconClassNames.join(' ')} />
              <div className="volume-bar-frame">
                <div className={barClassNames.join(' ')} style={barStyle} />
              </div>
            </div>
          );
        })()}
        {(() => {
          switch (status) {
            case 'acquiring':
            case 'denied':
            case 'previewing':
              return (
                <div className="buttons">
                  <button onClick={onClose}>Cancel</button>
                  <button onClick={onStart} disabled={status !== 'previewing'}>Start</button>
                </div>
              );
            case 'recording':
              return (
                <div className="buttons">
                  <button onClick={onPause}>Pause</button>
                  <button onClick={onStop}>Stop</button>
                </div>
              );
            case 'paused':
              return (
                <div className="buttons">
                  <button onClick={onResume}>Resume</button>
                  <button onClick={onStop}>Stop</button>
                </div>
              );
            case 'recorded':
              return (
                <div className="buttons">
                  <button onClick={onRetake}>Retake</button>
                  <button onClick={onAccept} disabled={status !== 'recorded'}>Accept</button>
                </div>
              );
            default:
          }
        })()}
        </div>

      </div>
    </div>
  );
}
