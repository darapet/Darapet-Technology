import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, Video } from 'lucide-react';

interface CameraCaptureFieldProps {
  onCapture: (file: File) => void;
  captured?: File | null;
}

/**
 * Live camera capture using getUserMedia, with a graceful fallback to the
 * device's native camera app (via <input capture>) when getUserMedia is
 * unavailable (older browsers, insecure contexts, etc).
 */
export function CameraCaptureField({ onCapture, captured }: CameraCaptureFieldProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supportsGetUserMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError('Could not access the camera. Check permissions or use the file picker below.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPreviewUrl(URL.createObjectURL(file));
      onCapture(file);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    openCamera();
  };

  if (captured && previewUrl) {
    return (
      <div className="space-y-2">
        <img src={previewUrl} alt="Captured" className="rounded-lg border border-white/20 max-h-48 object-cover" />
        <Button type="button" size="sm" variant="outline" onClick={retake} className="border-white/20 text-white">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retake
        </Button>
      </div>
    );
  }

  if (active) {
    return (
      <div className="space-y-2">
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border border-white/20 max-h-64 object-cover bg-black" />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={capture} className="bg-blue-600 hover:bg-blue-700">
            <Check className="w-3.5 h-3.5 mr-1.5" /> Capture
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={stopCamera} className="text-white/60">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-300 text-xs">{error}</p>}
      {supportsGetUserMedia ? (
        <Button type="button" size="sm" onClick={openCamera} variant="outline" className="border-white/20 text-white">
          <Camera className="w-3.5 h-3.5 mr-1.5" /> Open Camera
        </Button>
      ) : (
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer border border-dashed border-white/20 rounded-lg px-3 py-2 w-fit">
          <Video className="w-4 h-4" /> Take Photo
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setPreviewUrl(URL.createObjectURL(f)); onCapture(f); } }} />
        </label>
      )}
    </div>
  );
}
