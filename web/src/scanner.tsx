import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

// Live camera view that reads QR codes in the browser (jsQR, loaded only when the camera opens).
// Browsers only allow the camera on https or localhost.

function cameraError(err: unknown) {
  const name = (err as Error)?.name;
  if (name === 'NotAllowedError') return 'Camera permission is blocked. Allow the camera for this site and try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app.';
  return (err as Error)?.message || "Couldn't open the camera.";
}

/** Reports the first QR code it sees, then stops. Remount it (change its key) to scan again. */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState('');

  useEffect(() => {
    let stopped = false;
    let frame = 0;
    let stream: MediaStream | undefined;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(isSecureContext ? "This browser can't use the camera." : 'The camera only works when the app is opened over https.');
      }
      const [{ default: jsQR }, media] = await Promise.all([
        import('jsqr'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
      ]);
      stream = media;
      if (stopped) return media.getTracks().forEach((t) => t.stop());
      const v = video.current!;
      v.srcObject = media;
      await v.play();

      let last = 0;
      const tick = (time: number) => {
        if (stopped) return;
        frame = requestAnimationFrame(tick);
        if (time - last < 120 || v.readyState < 2 || !v.videoWidth) return; // ~8 checks a second is plenty
        last = time;
        const scale = Math.min(1, 720 / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) {
          stopped = true;
          cancelAnimationFrame(frame);
          navigator.vibrate?.(60);
          onScanRef.current(code.data);
        }
      };
      frame = requestAnimationFrame(tick);
    })().catch((err) => !stopped && setError(cameraError(err)));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="scanner scanner-error" role="alert">
        <CameraOff size={28} />
        <span>{error}</span>
      </div>
    );
  }
  return (
    <div className="scanner">
      <video ref={video} muted playsInline aria-label="Camera" />
      <span className="scanner-frame" aria-hidden />
    </div>
  );
}
