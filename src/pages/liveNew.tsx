import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LiveNew: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const intervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  // 1) Initialize camera & mic
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(ms => {
        setStream(ms);
        if (videoRef.current) videoRef.current.srcObject = ms;
      })
      .catch(console.error);
  }, []);

  // auto-play the video preview
  useEffect(() => {
    if (stream) videoRef.current?.play();
  }, [stream]);

  const [aiSpeaking, setAiSpeaking] = useState(false);
  const isPlayingRef = useRef(false);

  // Poll /question every 3s and play audio when true
  useEffect(() => {
    const poll = setInterval(async () => {
      if (isPlayingRef.current) return;

      try {
        const res = await fetch('http://127.0.0.1:5001/question', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        // If question endpoint returns true, AI is ready to speak
        if (data === true) {
          isPlayingRef.current = true;
          setAiSpeaking(true);
          setStatus('idle'); // clear loading so we can see the UI

          const audio = new Audio('http://127.0.0.1:5001/audio');

          // When AI finishes speaking, let the user record again
          audio.onended = () => {
            isPlayingRef.current = false;
            setAiSpeaking(false);
            setVideoBlob(null); // Clear previous user recording so they can record a new one
          };

          audio.play().catch(err => {
            console.error('Audio play error:', err);
            isPlayingRef.current = false;
            setAiSpeaking(false); // fallback if audio fails
          });
        }
      } catch (err) {
        console.error('Error polling /question:', err);
      }
    }, 3000);
    return () => clearInterval(poll);
  }, []);

  // Start recording
  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setVideoBlob(null);
    setSeconds(0);
    intervalRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);

    const mr = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });
    recorderRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => setVideoBlob(new Blob(chunksRef.current, { type: 'video/webm' }));
    mr.start();
    setRecording(true);
  };

  // Stop recording
  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
  };

  // Upload video and navigate
  const uploadVideo = async (blob: Blob) => {
    setStatus('uploading');
    const form = new FormData();
    form.append('file', blob, 'recording.webm');
    try {
      const res = await fetch('http://127.0.0.1:5001/uploadInterview', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      // Don't set success route yet, wait for polling to pick up the AI response
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const finishLive = async () => {
    try {
      setStatus('uploading');
      const res = await fetch(
        `http://127.0.0.1:5001/check/interUpload0.mp4`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(`Check failed: ${res.statusText}`);
      // optionally you can await res.json() or res.text() here
      setStatus('success');
      navigate("/inter");
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const formatTime = (t: number) =>
    `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <video
        ref={videoRef}
        className="video-preview mirror mb-4 w-full max-w-md"
        muted
        autoPlay
        playsInline
        style={{ transform: 'scaleX(-1)' }}
      />

      <div className="controls flex items-center space-x-4">
        {status === 'idle' && (
          <>
            {aiSpeaking ? (
              <div className="alert alert-info">AI is speaking...</div>
            ) : (
              <>
                <div className="timer font-mono">{formatTime(seconds)}</div>
                {!recording ? (
                  <button onClick={startRecording} className="btn-record">Record</button>
                ) : (
                  <button onClick={stopRecording} className="btn-stop">Stop</button>
                )}
                {!recording && videoBlob && (
                  <button onClick={() => uploadVideo(videoBlob)} className="btn-record">Upload</button>
                )}
                <button onClick={finishLive} className='btn-record'>End Live</button>
              </>
            )}
          </>
        )}

        {status === 'uploading' && (
          <div className="alert alert-info">
            Loading...
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-error">
            Failed to process request. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveNew;
