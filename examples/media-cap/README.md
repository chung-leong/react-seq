# Media Capture Example

In this example, we're going to create a React hook that allows a component to capture image, video, or audio. We'll
utilize the [`useSequentialState`](../../doc/useSequentialState.md) hook to help us manage the different stages of
the capturing process.

## Seeing the code in action

Go to the `examples/media-cap` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

![screen shot](./img/screenshot-1.jpg)

Click on one of the buttons to open up a dialog box that captures the specific type of media.

## The hook consumer

First, let us take a quick look at the [`VideoDialogBox`](./src/VideoDialogBox.js) component:

```js
export default function VideoDialogBox({ onClose, onCapture }) {
  const {
    status,
    liveVideo,
    capturedVideo,
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
  } = useMediaCapture({ watchVolume: true });
```

The first thing it does is call the [`useMediaCapture`](./src/media-cap.js) hook, specifying that it wants the
current volume monitored. From the hook it receives a number of state variables (top half) and also functions to
call (bottom half).

Going [further down](.//src/VideoDialogBox.js#L55), within the return statement we seeing the following IIFE:

```js
{(() => {
  switch(status) {
    case 'acquiring':
      return (
        <span className="fa-stack fa-lg">
          <i className="fa fa-video fa-stack-1x" />
        </span>
      );
    case 'denied':
      return (
        <span className="fa-stack fa-lg">
          <i className="fa fa-video fa-stack-1x" />
          <i className="fa fa-ban fa-stack-2x" />
        </span>
      );
    case 'previewing':
    case 'recording':
    case 'paused':
      return <StreamVideo srcObject={liveVideo.stream} style={size} muted />;
    case 'recorded':
      return <BlobVideo srcObject={capturedVideo.blob} style={size} controls />;
    default:
  }
})()}
```

This is the main content of the dialog box. At the "acquiring" stage, when the browser is asking the user for
permission to use the camera, we simply show an icon. If the user said no, we put a ban icon over it. At the
"previewing" stage, when we have a live video stream, we render a [`StreamVideo`](./src/StreamVideo.js) component,
which simply returns a `<video>` element and attaches the stream. The live video remains through the "recording" and
"paused" stages. When we've reached the "recorded" stage, we render a [`BlobVideo`](./src/BlobVideo), another
simple component tasked simply with managing the URL to the blob.

## The hook

Let us move on and start examining [the hook itself](./src/media-cap.js):

```js
export function useMediaCapture(options = {}) {
  const {
    video = true,
    audio = true,
    preferredDevice = 'front',
    selectNewDevice = true,
    watchVolume = false,
  } = options;
  return useSequentialState(async function*({ initial, mount, manageEvents }) {
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
    let selectedDeviceId;
```

It starts out by extracting some option variables from the object given. Then it proceeds to immediately call
[`useSequentialState`](../../doc/useSequentialState.md). The async generator function is where most of the action
happens.

We make use of three functions provided by `useSequentialState`: `initial` to set the hook's initial state, `mount`
to run code during the `useEffect` phase of the component lifecycle, and `manageEvents` to manage events with the
help of promises.

The generator function begins by declaring variables that will get send to the hook consumer. [Further down](./src/media-cap.js#L24), we see the functions that the hook consumer can call:

```js
    const [ on, eventual ] = manageEvents({});

    function snap(mimeType, quality) {
      on.userRequest({ type: 'snap', mimeType, quality });
    }

    function record(options, segment = undefined, callback = null) {
      on.userRequest({ type: 'record', options, segment, callback });
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
```

As you can see, each of them will fulfill the [`eventual.userRequest`](../../doc/manageEvents.md) promise.

We see next the function that packages our local variables into an object, to be delivered to the hook consumer:

```js
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
```

The function is first invoked on [line 83](./src/media-video.js) to set the initial state:

```js
    initial(currentState());
```

What follow are functions that deal with the nitty-gritty of the capturing process. We'll skip over these and head to
[line 288](./src/media-cap.js#L288) where [`mount`](../../doc/mount.md) is called:

```js
    mount(() => {
      // let generator code know that the component has mounted
      on.mount();

      // watch for orientation change
      function onOrientationChange(evt) {
        // wait for resize event to occur
        window.addEventListener('resize', async () => {
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

      // watch for permission change
      navigator.permissions.query({ name: 'camera' }).then((cameraStatus) => {
        cameraStatus.onchange = on.permissionChange;
      }, () => {});
      navigator.permissions.query({ name: 'microphone' }).then((microphoneStatus) => {
        microphoneStatus.onchange = on.permissionChange;
      }, () => {});
      return () => {
        window.removeEventListener('orientationchange', onOrientationChange);
        navigator.mediaDevices.removeEventListener('devicechange', on.deviceChange);
        mediaRecorder?.stop();
        closeStream();
      };
    });
```

The function passed to `mount` will be invoked in a `useEffect` hook. Attachment of listeners to the DOM needs to
happen here and not in the generator function since it is a side effect. We're taking the liberty of performing some  
additional clean-up unrelated the removal of handlers here, to save ourselves the trouble of having to set up a
try-finally block (how releasing of resources is normally done).

As you can see, there are quite a number of events that can happen. The device could get rotated, thereby changing the
dimensions of the video feed. A device can get plugged in or unplugged. Permission levels could be toggled. All of
these events will cause different `eventual` promises to be fulfilled.

At the top of the callback function, we call `on.mount` to let the generator function know that the component has
mounted. The awaiting on `eventual.mount` happens right below this section:

```js
    await eventual.mount;
    for (;;) {
      try {
```

The reason for we wait for the component to mount before entering the main event loop is that while, strict speaking,
obtaining a media stream is not a side effect, it can trigger a browser permission prompt. Our code would behave
weirdly otherwise in strict mode, due to the `useMemo` hook used by `useSequential` performing double invocation in
that mode (during development). This statement stops the second, abandoned generator from going any further. It'll be
stuck here, waiting for a promise that never gets fulfilled, until a timer function comes and puts a kibosh
on it.

Once the generator gets past this point, it enters an infinite loop with a try-catch block inside. Let us first examine
the catch block ([line 410](./src/media-cap.js)):

```js
      } catch (err) {
        lastError = err;
        if (status === 'acquiring') {
          status = 'denied';
        }
      }
      yield currentState();
    } // end of for loop
```

It's quite simple. The error just get saved to `lastError`. If we're in the middle of acquiring a device, the status
gets changed to "denied".

Below the catch block is the generator's one and only `yield` statement. So every time we go through the for loop,
the hook consumer will receive a new state, consisting of the local variables declared at the beginning of the
generator function. The UI will get updated to reflect the changes that have occurred.

Now, let us look at what our event loop does in each of the possible statuses.

## Status: "acquiring" ([line 326](./src/media-cap.js#L326))

```js
        if (status === 'acquiring') {
          // acquire a media-capturing device
          await openStream();
          status = 'previewing';
        } else ...
```

We try opening a media stream. If the operation succeeds, the status is changed to "previewing". If not, we end up in
the catch block, described above.

## Status: "previewing" ([line 330](./src/media-cap.js#L330))

```js
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
            selectedDeviceId = evt.deviceId;
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
                selectedDeviceId = newDevice.id;
                status = 'acquiring';
              }
            }
          }
        } else ...
```

At this point, the user is seeing the output of his camera. The number of things can happen. The user might:

* Click a button in the dialog (fulfilling `eventual.userRequest`)
* Select a different device using the dropdown (also fulfilling `eventual.userRequest`)
* Unplug the active camera (fulfilling `eventual.streamChange`)
* Plug in a different camera (fulfilling `eventual.deviceChange`)
* Speak into the microphone (fulfilling `eventual.volumeChange`)

We explicit anticipate all these possibilities in our `await` statement.

(If the statement looks strange to you, please consult the documentation of
[`manageEvents`](../../doc/manageEvents.md))

If the user clicks the Start button, we start the recorder then change the status to "recording".

If the user clicks the Take button (in [`PhotoDialogBox`](./src/PhotoDialogBox.js)), we take a snapshot then change
the status to "recorded".

If the user chooses a different camera, we close the current stream, save the device id, and go back to "acquiring".

If the user unplugs the camera, we do the same thing in hope of finding another camera.

If the user plugs in a new camera, we choose it as the active device since using the camera is very likely the
user's intention.

If the volume level is different, we don't need to do anything as the variable `volume` is already updated. The
yield statement at the bottom of the loop will deliver this new value to the hook consumer, which will update the
volume bar.
