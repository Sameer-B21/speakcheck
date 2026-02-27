import { Canvas } from '@react-three/fiber';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioParticles } from '../components/dynamicAvatar/AudioParticles';

const LiveSpeech: React.FC = () => {
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const intervalRef = useRef<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(ms => {
        setStream(ms);
        if (videoRef1.current) videoRef1.current.srcObject = ms;
        if (videoRef2.current) videoRef2.current.srcObject = ms;
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (stream) {
      videoRef1.current?.play();
      videoRef2.current?.play();
    }
  }, [stream]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setVideoBlob(null);
    setSeconds(0);

    intervalRef.current = window.setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    const mr = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });
    recorderRef.current = mr;

    mr.ondataavailable = e => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setVideoBlob(blob);
    };

    mr.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }
  };

  const uploadVideo = async (blob: Blob) => {
    setStatus('uploading');
    const form = new FormData();
    form.append('file', blob, 'recording.webm');

    try {
      const res = await fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());
      console.log('Upload success');
      setStatus('success');
      navigate('/display');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const formatTime = (t: number) =>
    `${Math.floor(t / 60)
      .toString()
      .padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;

  return (
    <div
      className="record-main"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
    >
      <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
        <video
          ref={videoRef1}
          className="video-preview mirror"
          muted
          autoPlay
          playsInline
          style={{ transform: 'scaleX(-1)', flex: 1 }}
        />
        <div className='video-preview'>
          <audio
            ref={audioRef}
            src="backend/uploads/test.mp3"
            controls
            autoPlay
            style={{ position: 'absolute', top: 20, left: 20, zIndex: 1 }}
          />
          <Canvas camera={{ position: [0, 0, 8] }}>
            <ambientLight intensity={0.3} />
            <AudioParticles
              audioRef={audioRef}
              count={10000}
              baseRadius={2.5}
              minRadius={2}
              radiusFactor={0.5}
              baseWaveAmp={0.02}
              audioWaveAmp={0.02}
              idleWaveAmp={0.005}
              idleSpeed={0.2}
              smoothFactor={0.25}
            />
          </Canvas>
        </div>
      </div>

      <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {status === 'idle' && (
          <>
            <div className="timer" style={{ fontFamily: 'monospace' }}>{formatTime(seconds)}</div>
            {!recording ? (
              <button onClick={startRecording} className="btn-record">
                Record
              </button>
            ) : (
              <button onClick={stopRecording} className="btn-stop">
                Stop
              </button>
            )}

            {!recording && videoBlob && (
              <button onClick={() => uploadVideo(videoBlob)} className="btn-upload">
                Upload
              </button>
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
            Failed to upload. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSpeech;