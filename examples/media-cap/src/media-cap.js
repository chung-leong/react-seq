import { useSequentialState } from 'react-seq';

export function useMediaCapture(options = {}) {
  const {
    active = true,
    video = true,
    audio = true,
    preferredDevice = 'front',
    selectNewDevice = true,
    watchVolume = false,
  } = options;
  return useSequentialState(async function*({ initial, mount, manageEvents, signal }) {
    let status = (active) ? 'acquiring' : 'pending';
    let duration;
    let volume = (watchVolume) ? -Infinity : undefined;
    let liveVideo;
    let liveAudio;
    let capturedVideo;
    let capturedAudio;
    let capturedImage;
    let lastError;
    let devices = [];
    let selectedDeviceId;

    const [ on, eventual ] = manageEvents({});

    function snap(options = {}) {
      on.userRequest({ type: 'snap', options });
    }

    function record(options = {}) {
      on.userRequest({ type: 'record', options });
    }

    function pause() {
      on.userRequest({ type: 'pause' });
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
        selectedDeviceId,

        snap,
        record,
        pause,
        stop,
        resume,
        clear,
        selectDevice,
      };
    }

    if (status === 'acquiring') {
      if (typeof(navigator) !== 'object' || !navigator.mediaDevices) {
        status = 'denied';
      }  
    }

    // set initial state
    initial(currentState());

    // don't bother doing anything at all when there's no media support
    // (or if it's not yet needed)
    if (status === 'denied' || status === 'pending') {
      return;
    }

    // update list of devices connected to the machine
    async function getDevices() {
      const kind = (video) ? 'videoinput' : 'audioinput';
      devices = await enumerateDevices(kind);
      // we can't get the labels without obtaining permission first
      if (devices.length > 0 && devices.every(d => !d.label)) {
        // trigger request for permission, then enumerate again
        const stream = await getMediaStream({ video, audio });
        stopMediaStream(stream);
        devices = await enumerateDevices(kind);
      }
    }

    let stream;

    async function openStream() {
      // look for devices first
      await getDevices();
      // use the one chosen by the user if it's still there
      let device = devices.find(d => d.id === selectedDeviceId);
      if (!device) {
        // see if the label contains the right keyword
        const keyword = preferredDevice.toLowerCase();
        device = devices.find(d => d.label.toLowerCase().includes(keyword));
      }
      if (!device) {
        if (preferredDevice === 'front') {
          device = devices[0];
        } else {
          device = devices[devices.length - 1];
        }
      }
      // obtain a media stream with the correct constraints
      const constraints = { video, audio };
      if (device) {
        // put in device id
        if (video) {
          constraints.video = { ...video, deviceId: device.id };
        } else if (audio) {
          constraints.audio = { ...audio, deviceId: device.id };
        }
      }
      stream = await getMediaStream(constraints);
      selectedDeviceId = (device) ? device.id : undefined;
      if (video) {
        const el = await createVideoElement(stream);
        liveVideo = { stream, width: el.videoWidth, height: el.videoHeight };
        releaseVideoElement(el);
      } else if (audio) {
        liveAudio = { stream };
      }
      // keep an eye out for premature stream termination (user unplugs the camera, for instance)
      const tracks = stream.getTracks();
      for (const track of tracks) {
        track.onended = on.streamChange.bind({ type: 'streamend' });
      }
      // monitor audio volume
      await watchAudioVolume();
    }

    function closeStream() {
      if (stream) {
        unwatchAudioVolume();
        stopMediaStream(stream);
        liveVideo = undefined;
        liveAudio = undefined;
        stream = undefined;
      }
    }

    let mediaRecorder;
    let mediaData;
    let mediaDataCallback;
    let videoDimensions;

    async function startRecorder(options) {
      // see https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder
      const {
        mimeType = (video) ? 'video/mp4' : 'audio/mpeg',
        audioBitsPerSecond = 128000,
        videoBitsPerSecond = 2500000,
        timeslice,
        callback,
        keepLocalCopy = true, 
      } = options;
      mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond, videoBitsPerSecond });
      mediaRecorder.addEventListener('dataavailable', onDataAvailable);
      mediaRecorder.addEventListener('start', startTimer);
      mediaRecorder.addEventListener('pause', stopTimer);
      mediaRecorder.addEventListener('resume', startTimer);
      mediaRecorder.addEventListener('stop', stopTimer);
      mediaData = keepLocalCopy ? [] : null;
      mediaDataCallback = callback;
      duration = 0;
      if (liveVideo) {
        // save dimensions in case the device gets rotated when recording
        videoDimensions = { width: liveVideo.width, height: liveVideo.height };
      }
      mediaRecorder.addEventListener('start', on.mediaStart, { once: true });
      mediaRecorder.addEventListener('error', on.mediaError.throw, { once: true });
      mediaRecorder.start(timeslice);
      await eventual.mediaStart.or.mediaError;
    }

    async function stopRecorder() {
      mediaRecorder.addEventListener('stop', on.mediaStop, { once: true });
      mediaRecorder.addEventListener('error', on.mediaError, { once: true });
      mediaRecorder.stop();
      await eventual.mediaStop.or.mediaError;
      let recorded = false;
      if (mediaData?.length > 0) {
        let blob = mediaData[0];
        if (mediaData.length > 1) {
          blob = new Blob(mediaData, { type: blob.type });
        }
        if (videoDimensions) {
          capturedVideo = { blob, duration, ...videoDimensions };
          videoDimensions = undefined;
        } else {
          capturedAudio = { blob, duration };
        }
        recorded = true;
      }
      mediaRecorder = undefined;
      mediaData = undefined;
      mediaDataCallback = undefined;
      duration = undefined;
      return recorded;
    }

    async function createSnapShot(options) {
      const { 
        mimeType = 'image/jpeg', 
        quality = 0.9, 
      } = options;
      const el = await createVideoElement(liveVideo.stream)
      const blob = await saveVideoSnapShot(el, mimeType, quality);
      capturedImage = { blob, width: el.videoWidth, height: el.videoHeight };
      releaseVideoElement(el);
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
    let audioSource;
    let audioAnalyser;
    let audioInterval;

    async function watchAudioVolume() {
      if (typeof(AudioContext) !== 'function' || !watchVolume || !audio) {
        return;
      }
      try {
        audioContext = new AudioContext();
        audioAnalyser = new AnalyserNode(audioContext, { fftSize: 256, smoothingTimeConstant: 0.3 });
        audioSource = new MediaStreamAudioSourceNode(audioContext, { mediaStream: stream });
        audioSource.connect(audioAnalyser);
        const { frequencyBinCount } = audioAnalyser;
        const { sampleRate } = audioContext;
        const data = new Float32Array(frequencyBinCount);
        const step = sampleRate / 2 / frequencyBinCount;
        audioInterval = setInterval(() => {
          let maxDb = -Infinity;
          audioAnalyser.getFloatFrequencyData(data);
          for (let i = (300 / step)|0, f = i * step; f <= 3400; i++, f += step) {
            const db = data[i]
            if (db > maxDb) {
              maxDb = db;
            }                
          }
          const newVolume = Math.round(maxDb);
          if (newVolume !== volume) {
            volume = newVolume;
            on.volumeChange({ type: 'volumechange' });  
          }
        }, 50);
        /* c8 ignore next 2 */
      } catch (err) {
      }
    }

    function unwatchAudioVolume() {
      if (!audioContext) {
        return;
      }
      clearInterval(audioInterval);
      audioSource.disconnect(audioAnalyser);
      audioContext.close();
      audioContext = undefined;
      audioSource = undefined;
      audioAnalyser = undefined;
      volume = undefined;
    }

    function onDataAvailable(evt) {
      const { data } = evt;
      if (mediaData) {
        mediaData.push(data);
      }
      if (mediaDataCallback) {
        mediaDataCallback(data);
      }
    }

    // wait for mount to occur
    await mount();

    // set up event listeners
    const orientationChange = (evt) => {
      // wait for resize event to occur
      window.addEventListener('resize', async () => {
        if (liveVideo) {
          const el = await createVideoElement(stream);
          if (el.videoWidth !== liveVideo.width || el.videoHeight !== liveVideo.height) {
            liveVideo = { stream, width: el.videoWidth, height: el.videoHeight };
            on.streamChange({ type: 'resize' });
          }
        }
      }, { once: true });
    };
    if (window.screen.orientation) {
      window.screen.orientation.addEventListener('change', orientationChange, { signal });
    } else {
      window.addEventListener('orientationchange', orientationChange, { signal });
    }
    navigator.mediaDevices.addEventListener('devicechange', on.deviceChange, { signal });

    // watch for permission change
    if (navigator.permissions) {
      for (const name of [ 'camera', 'microphone' ]) {
        const status = await navigator.permissions.query({ name });
        status.addEventListener('change', on.permissionChange, { signal });
      } 
    }

    try {
      for (;;) {
        try {
          if (status === 'acquiring') {
            // acquire a media-capturing device
            await openStream();
            status = 'previewing';
          } else if (status === 'previewing') {
            const res = await eventual.userRequest.or.streamChange.or.deviceChange.or.volumeChange;
            if (res.userRequest?.type === 'record') {
              await startRecorder(res.userRequest.options);
              status = 'recording';
            } else if (res.userRequest?.type === 'snap') {
              await createSnapShot(res.userRequest.options);
              status = 'recorded';
            } else if (res.userRequest?.type === 'select') {
              closeStream();
              selectedDeviceId = res.userRequest.deviceId;
              status = 'acquiring';
            } else if (res.streamChange?.type === 'streamend') {
              closeStream();
              status = 'acquiring';
            } else if (res.deviceChange) {
              const prev = devices;
              await getDevices();
              if (selectNewDevice) {
                const newDevice = devices.find(d1 => !prev.find(d2 => d2.id === d1.id));
                if (newDevice) {
                  closeStream();
                  selectedDeviceId = newDevice.id;
                  status = 'acquiring';
                }
              }
            }
          } else if (status === 'recording') {
            const res = await eventual.userRequest.or.streamChange.or.durationChange.or.volumeChange;
            if (res.userRequest?.type === 'stop') {
              const recorded = await stopRecorder();
              status = (recorded) ? 'recorded' : 'previewing';
            } else if (res.userRequest?.type === 'pause') {
              mediaRecorder.pause();
              status = 'paused';
            } else if (res.streamChange?.type === 'streamend') {
              closeStream();
              const recorded = await stopRecorder();
              status = (recorded) ? 'recorded' : 'acquiring';
            }
          } else if (status === 'paused') {
            const res = await eventual.userRequest.or.streamChange.or.volumeChange;
            if (res.userRequest?.type === 'stop') {
              const recorded = await stopRecorder()
              status = (recorded) ? 'recorded' : 'previewing';
            } else if (res.userRequest?.type === 'resume') {
              mediaRecorder.resume();
              status = 'recording';
            } else if (res.streamChange?.type === 'streamend') {
              closeStream();
              const recorded = await stopRecorder();
              status = (recorded) ? 'recorded' : 'acquiring';
            }
          } else if (status === 'recorded') {
            unwatchAudioVolume();
            const res = await eventual.userRequest.or.streamChange;
            if (res.userRequest?.type === 'clear') {
              capturedVideo = undefined;
              capturedAudio = undefined;
              capturedImage = undefined;
              status = (stream) ? 'previewing' : 'acquiring';
              if (stream) {
                await watchAudioVolume();
                // refresh the list just in case something was plugged in
                await getDevices();
              }
            } else if (res.streamChange?.type === 'streamend') {
              closeStream();
            }
          } else if (status === 'denied') {
            const res = await eventual.deviceChange.or.permissionChange;
            if (res.deviceChange) {
              await getDevices();
              if (devices.length > 0) {
                status = 'acquiring';
              }
            } else if (res.permissionChange) {
              status = 'acquiring';
            }
          }
        } catch (err) {
          lastError = err;
          if (status === 'acquiring') {
            status = 'denied';
          }
        }
        yield currentState();
      } // end of for loop
    } finally {
      mediaRecorder?.stop();
      closeStream();
    }
  }, [ active, video, audio, preferredDevice, selectNewDevice, watchVolume ]);
}

async function enumerateDevices(kind) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === kind).map(({ deviceId, label }) => {
    return {
      id: deviceId,
      label: label || '',
    };
  });
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
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.oncanplay = () => resolve(video);
    video.onerror = (evt) => reject(evt.error);
    video.play();
  });
}

function releaseVideoElement(video) {
  video.pause();
  video.srcObject = null;
}

async function saveVideoSnapShot(video, mimeType, quality) {
  const { videoWidth, videoHeight } = video;
  const canvas = document.createElement('CANVAS');
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, videoWidth, videoHeight);
  if (typeof(canvas.toBlob) === 'function') {
    return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
  } else {
    const dataURL = canvas.toDataURL(mimeType, quality);
    const res = await fetch(dataURL);
    return res.blob();
  }
}
