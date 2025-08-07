"use client";
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');


const App = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const streamRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const startVideo = async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = localStream;
      streamRef.current = localStream;
      setStream(localStream);
    };

    startVideo();

    socket.on('offer', async (data) => {
      await createPeerConnection();
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (data) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
    });

    socket.on('ice-candidate', (candidate) => {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }, []);

  const createPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection();

    console.log(`🚀 ~ stream.getTracks ~ stream:`, streamRef.current);
    streamRef.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, streamRef.current);
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };
  };

  const callUser = async () => {
    await createPeerConnection();
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  return (
    <div>
      <h2>Video Call App</h2>
      <div>
        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 300 }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 300 }} />
      </div>
      <button onClick={callUser}>Call</button>
    </div>
  );
};

export default App;
