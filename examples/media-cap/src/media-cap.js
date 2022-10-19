import { useGeneratedState } from 'react-seq';

export function useMediaCapture(options = {}) {
  const options = {
    video = true,
    audio = true,
    preferredDevice = 'front',
    selectNewDevice = true,
    watchVolume = false,
  } = options;
  const [ state ] = useGeneratedState(async function*({ initial, manageEvents }) {
    const [ on, eventual ] = manageEvents();
    let status = 'acquiring';
    let duration;
    let volume;
    let liveVideo;
    let liveAudio;
    let capturedVideo;
    let capturedAudio;
    let capturedImage;
    let lastError;
    let devices = [];
    let chosenDeviceId;

    function record(options, segment = undefined, callback = null) {
      on.userRequest({ type: 'record', options, segment, callback });
    }

    function snap(mimeType, quality) {
      on.userRequest({ type: 'snap', mimeType, quality });
    }

    function pause() {
      on.userRequest({ type: 'pause '});
    }

    function stop() {
      on.userRequest({ type: 'stop' });
    }

    function resume() {
      on.userRequest({ type: 'resume' });
    }

    function clear() {
      on.userRequest({ type: 'clear' });
    }

    function selectDevice(deviceId) {
      on.userRequest({ type: 'select', deviceId });
    }

    function currentState() {
      return {
        status,
        duration,
        volume,
        liveVideo,
        liveAudio,
        capturedVideo,
        capturedAudio,
        capturedImage,
        lastError,
        devices,
        chosenDeviceId,

        record,
        pause,
        stop,
        resume,
        clear,
        selectDevice,
      };
    }

    if (!global.navigator || !navigator.mediaDevices) {
      status = 'denied';
    }

    // set initial state
    initial(currentState());

    // don't bother doing anything at all when there's no media support
    if (status === 'denied') {
      return;
    }

    // update list of devices connected to the machine
    async function getDevices() {
      const kind = (video) ? 'videoinput' : 'audioinput';
      devices = await enumerateDevices(kind);
      // we can't get the labels without obtaining permission first
      if (devices.all(d => !d.label)) {
        // trigger request for permission, then enumerate again
        const stream = await getMediaStream({ video, audio });
        stopMediaStream(stream);
        devices = await enumerateDevices(kind);
      }
    }

    let stream;

    function openStream() {
      // use the one chosen by the user if it's still there
      let device = devices.find(d => d.id === chosenDeviceId);
      if (!device) {
        // see if the label contains the right keyword
        device = devices.find(d => d.label.toLowerCase().includes(preferredDevice))
      }
      if (!device) {
        device = devices[0];
      }
      // obtain a media stream with the correct constraints
      const constraints = { video, audio };
      if (device) {
        // put in device id
        if (video) {
          constraints.video = { ...(video instanceof Object ? video : {}), deviceId: device.id };
        } else if (audio) {
          constraints.audio = { ...(audio instanceof Object ? audio : {}), deviceId: device.id };
        }
      }
      stream = await getMediaStream(constraints);
      chosenDeviceId = (device) ? device.id : undefined;
      if (video) {
        const el = await createVideoElement(stream);
        liveVideo = { stream, width: el.videoWidth, height: el.videoHeight };
      } else if (audio) {
        liveAudio = { stream };
      }
      // keep an eye out for premature stream termination (user unplugs the camera, for instance)
      const tracks = stream.getTracks();
      for (const track of tracks) {
        track.onended = on.streamChange.bind({ type: 'streamend' });
      }
      // monitor audio volume
      watchAudioVolume();
    }

    function closeStream() {
      unwatchAudioVolume();
      stopMediaStream(stream);
      liveVideo = undefined;
      liveAudio = undefined;
      stream = undefined;
    }

    let mediaRecorder;
    let mediaData;
    let mediaDataCallback;
    let videoDimensions;

    async function startRecorder(options, segment, callback) {
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.addEventListener('dataavailable', onDataAvailable);
      mediaRecorder.addEventListener('start', startTimer);
      mediaRecorder.addEventListener('pause', stopTimer);
      mediaRecorder.addEventListener('resume', startTimer);
      mediaRecorder.addEventListener('stop', stopTimer);
      mediaRecorder.start(segment);
      mediaData = [];
      mediaDataCallback = callback;
      duration = 0;
      if (liveVideo) {
        // save dimensions in case the device gets rotated when recording
        videoDimensions = { width: liveVideo.width, height: liveVideo.height };
      }
      mediaRecorder.addEventListener('start', on.mediaStart, { once: true });
      await on.mediaStart;
    }

    async function stopRecorder() {
      mediaRecorder.addEventListener('stop', on.mediaStop, { once: true });
      mediaRecorder.stop();
      await eventual.mediaStop;
      let recorded = false;
      if (metaData.length > 0) {
        let blob = metaData[0];
        if (blobs.length > 1) {
          blob = new Blob(blobs, { type: blob.type });
        }
        if (videoDimensions) {
          this.capturedVideo = { blob, duration, ...videoDimensions };
          videoDimensions = undefined;
        } else {
          this.capturedAudio = { blob, duration };
        }
        recorded = true;
      }
      mediaRecorder = undefined;
      mediaData = undefined;
      mediaDataCallback = undefined;
      duration = undefined;
      return mediaData.length > 0;
    }

    async function createSnapShot(mimeType, quality) {
      const el = await createVideoElement(liveVideo.stream)
      const blob = await saveVideoSnapShot(el, mimeType, quality);
      capturedImage = { blob, width, height };
    }

    let interval;
    let lastTime;

    function startTimer() {
      lastTime = new Date();
      interval = setInterval(updateDuration, 500);
    }

    function stopTimer() {
      if (interval) {
        updateDuration();
        clearInterval(interval);
        interval = 0;
        lastTime = undefined;
      }
    }

    function updateDuration() {
      const now = new Date();
      duration += now - lastTime;
      lastTime = now;
      on.durationChange({ type: 'durationchange' });
    }

    let audioContext;
    let audioProcessor;
    let audioSource;

    function watchAudioVolume() {
      if (typeof(AudioContext) !== 'function' || !watchVolume || !audio) {
        return;
      }
      audioContext = new AudioContext();
      audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      audioSource = audioContext.createMediaStreamSource(stream);
      audioProcessor.addEventListener('audioprocess', ({ inputBuffer }) => {
        const samples = inputBuffer.getChannelData(0);
        let max = 0;
        for (const s of samples) {
          if (s > max) {
            max = s;
          }
        }
        const newVolume = Math.round(max * 100);
        if (newVolume !== volume) {
          volume = newVolume;
          on.volumeChange({ type: 'volumechange' });
        }
      });
      audioSource.connect(audioProcessor);
      audioProcessor.connect(audioContext.destination);
    }

    function unwatchAudioVolume() {
      if (!audioContext) {
        return;
      }
      audioProcessor.disconnect(audioContext.destination);
      audioSource.disconnect(audioProcessor);
      audioContext = undefined;
      audioSource = undefined;
      audioProcessor = undefined;
      volume = undefined;
    }

    function onDataAvailable({ data }) {
      mediaData.push(blob);
      if (mediaDataCallback) {
        mediaDataCallback(data);
      }
    }

    function onOrientationChange(evt) {
      // wait for resize event to occur
      window.addEventListener('resize', () => {
        if (liveVideo) {
          const el = await createVideoElement(stream);
          if (el.videoWidth !== liveVideo.width || el.videoHeight !== liveVideo.height) {
            liveVideo = { stream, width: el.videoWidth, height: el.videoHeight };
            on.streamChange({ type: 'streamchange' });
          }
        }
      }, { once: true });
    }
    window.addEventListener('orientationchange', onOrientationChange);
    navigator.mediaDevices.addEventListener('devicechange', on.deviceChange);

    try {
      for (;;) {
        try {
          if (status === 'acquiring') {
            // acquire a media-capturing device
            await openStream();
            status = 'previewing';
          } else if (status === 'previewing') {
            const evt = await eventual.userRequest.or.streamChange.or.deviceChange.or.volumeChange;
            if (evt.type === 'record') {
              await startRecorder(evt.options, evt.segment, evt.callback);
              status = 'recording';
            } else if (evt.type === 'snap') {
              await createSnapShot(evt.mimeType, evt.quality);
              status = 'recorded';
            } else if (evt.type === 'select') {
              closeStream();
              chosenDeviceId = evt.deviceId;
              status = 'acquiring';
            } else if (evt.type === 'streamend') {
              closeStream();
              status = 'acquiring';
            } else if (evt.type === 'devicechange') {
              const prev = devices;
              await getDevices();
              if (selectNewDevice) {
                const newDevice = devices.find(d1 => !prev.find(d2 => d2.id === d1.id));
                if (newDevice) {
                  closeStream();
                  chosenDeviceId = newDevice.id;
                  status = 'acquiring';
                }
              }
            }
          } else if (status === 'recording') {
            const evt = await eventual.userRequest.or.streamChange.or.durationChange.or.volumeChange;
            if (evt.type === 'stop') {
              const recorded = await stopRecorder();
              status = recorded ? 'recorded' : 'previewing';
            } else if (evt.type === 'pause') {
              mediaRecorder.pause();
              status = 'paused';
            } else if (evt.type === 'streamend') {
              closeStream();
              const recorded = await stopRecorder();
              status = recorded ? 'recorded' : 'acquiring';
            }
          } else if (status === 'paused') {
            const evt = await eventual.userRequest.or.streamChange.or.volumeChange;
            if (evt.type === 'stop') {
              const recorded = await stopRecorder()
              status = (recorded) ? 'recorded' : 'previewing';
            } else if (evt.type === 'resume') {
              mediaRecorder.resume();
              status = 'recording';
            }
          } else if (status === 'recorded') {
            unwatchAudioVolume();
            const evt = await eventual.userRequest.or.streamChange;
            if (evt.type === 'clear') {
              capturedVideo = undefined;
              capturedAudio = undefined;
              capturedImage = undefined;
              status = (stream) ? 'previewing' : 'acquiring';
              if (stream) {
                watchAudioVolume();
                await getDevices();
              }
            } else if (evt.type === 'streamend') {
              closeStream();
            }
          } else if (status === 'denied') {
            const evt = await eventual.deviceChange;
            if (evt.type === 'devicechange') {
              await getDevices();
              if (devices.length > 0) {
                status = 'acquiring';
              }
            }
          }
        } catch (err) {
          lastError = err;
          if (status === 'acquiring') {
            status = 'denied';
          }
        }
        yield currentState();
      }
    } finally {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      if (stream)  {
        closeStream();
      }
      window.removeEventListener('orientationchange', onOrientationChange);
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
    }
  }, [ video, audio, preferredDevice, selectNewDevice, watchVolume ]);
  return state;
}

function enumerateDevices(kind) {
  try {
    const devices = navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === kind)..map(({ deviceId, label }) => {
      return {
        id: deviceId,
        label: label || '',
      };
    });
  } catch (err) {
    return [];
  }
}

async function getMediaStream(constraints) {
  return navigator.mediaDevices.getUserMedia(constraints);
}

function stopMediaStream(stream) {
  // stop all tracks
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function createVideoElement(stream) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('VIDEO');
    video.srcObject = liveVideo.stream;
    video.muted = true;
    video.oncanplay = () => resolve(video);
    video.onerror = (evt) => reject(evt.error);
  });
}

async function saveVideoSnapShot(video, mimeType, quality) {
  const { videoWidth, videoHeight } = video;
  const canvas = document.createElement('CANVAS');
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(el, 0, 0, videoWidth, videoHeight);
  if (typeof(canvas.toBlob) === 'function') {
    return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
  } else {
    const dataURL = canvas.toDataURL(mimeType, quality);
    const res = await fetch(dataURL);
    return res.blob();
  }
}
