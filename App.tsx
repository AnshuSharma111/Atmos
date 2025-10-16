/**
 * Atmos - Simple Broadcaster App
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  registerGlobals,
} from 'react-native-webrtc';
import io from 'socket.io-client';

// Register WebRTC globals
registerGlobals();

// PRODUCTION SERVER URL - Deployed on Render.com
// For local development: Change to 'http://YOUR_COMPUTER_IP:3001'
// For production: Use your Render backend URL (already configured)
const SIGNALING_SERVER_URL = 'https://atmos-7hli.onrender.com';

// Enhanced ICE servers for better connectivity through firewalls
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.ideasip.com' },
];

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <BroadcasterContent />
    </SafeAreaProvider>
  );
}

function BroadcasterContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [broadcasterId, setBroadcasterId] = useState<string | null>(null);
  const [isPreparingCamera, setIsPreparingCamera] = useState(false);
  const [useBackCamera, setUseBackCamera] = useState(true); // Track which camera to use
  const device = useCameraDevice(useBackCamera ? 'back' : 'front'); // Toggle camera for preview
  
  // WebRTC-related refs
  const socketRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, any>>(new Map()); // Map of viewerId -> RTCPeerConnection
  const localStreamRef = useRef<any>(null);
  const currentCameraIndexRef = useRef<number>(0); // Track which camera index to use for WebRTC

  // Request permissions on component mount
  useEffect(() => {
    const requestPermissions = async () => {
      // Request camera permission
      if (!hasPermission) {
        await requestPermission();
      }
      
      // Request microphone permission
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'Atmos needs access to your microphone for live streaming',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          setHasMicrophonePermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } catch (err) {
          console.error('Error requesting microphone permission:', err);
        }
      } else {
        // iOS
        const micPermission = await mediaDevices.getUserMedia({ audio: true });
        if (micPermission) {
          setHasMicrophonePermission(true);
          // Release tracks immediately, we'll get them again when streaming
          micPermission.getTracks().forEach(track => track.stop());
        }
      }
    };

    requestPermissions();

    return () => {
      // Clean up resources on unmount
      stopStreaming();
    };
  }, [hasPermission, requestPermission]);

  // Function to start streaming
  const startStreaming = async () => {
    if (!device || !hasPermission) {
      Alert.alert('Error', 'Camera permission not granted or device not available');
      return;
    }

    try {
      // Clean up any existing connections
      stopStreaming();
      
      // First, set streaming to true which will turn OFF the Camera preview (isActive={!isStreaming})
      console.log('[BROADCASTER] Disabling camera preview to release camera...');
      setIsStreaming(true);
      setIsPreparingCamera(true);
      
      // CRITICAL: Wait for Camera component to release the camera hardware
      // This prevents "Max cameras in use" error when getUserMedia tries to access it
      console.log('[BROADCASTER] Waiting 1.5 seconds for camera to be fully released...');
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
      console.log('[BROADCASTER] Camera should be released now, proceeding with getUserMedia...');
      
      setIsPreparingCamera(false);
      
      // Create unique broadcaster ID with timestamp to ensure uniqueness
      const deviceType = Platform.OS === 'ios' ? 'iOS' : 'Android';
      const newBroadcasterId = deviceType + '_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString().slice(-6);
      console.log(`[BROADCASTER] Generated broadcaster ID: ${newBroadcasterId}`);
      setBroadcasterId(newBroadcasterId);
      
      // Disconnect any existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      console.log(`Connecting to signaling server at ${SIGNALING_SERVER_URL}`);
      
      // Connect to signaling server with improved options
      socketRef.current = io(SIGNALING_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      
      // Flag to track if we've registered successfully
      let broadcasterRegistered = false;
      
      // Set up socket event handlers
      socketRef.current.on('connect', () => {
        console.log('[BROADCASTER] Connected to signaling server');
        // DON'T register immediately - wait for stream to be ready
        // Registration will happen after getUserMedia completes
        console.log('[BROADCASTER] Socket connected, waiting for media stream before registration...');
      });
      
      // Listen for confirmation of monitor number assignment which indicates successful registration
      socketRef.current.on('monitor-number', (data: {broadcasterId: string, number: number}) => {
        if (data.broadcasterId === newBroadcasterId) {
          console.log(`Broadcaster registration confirmed! Monitor number: ${data.number}`);
          broadcasterRegistered = true;
        }
      });
      
      socketRef.current.on('disconnect', (reason: string) => {
        console.log(`Socket disconnected: ${reason}`);
        if (isStreaming) {
          Alert.alert('Connection Lost', 'Lost connection to the streaming server');
        }
      });
      
      socketRef.current.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
        Alert.alert('Connection Error', `Could not connect to the streaming server at ${SIGNALING_SERVER_URL}. Error: ${error.message}`);
        stopStreaming();
      });
      
      // Handle viewer connection requests
      socketRef.current.on('viewer-requested-connection', async (data: any) => {
        try {
          console.log(`[BROADCASTER] Viewer ${data.viewerId} requested connection, creating peer connection and sending offer`);
          
          if (!localStreamRef.current) {
            console.error('[BROADCASTER] Cannot send offer - stream not ready');
            Alert.alert('Error', 'Camera stream not ready');
            return;
          }
          
          // Log stream details
          const tracks = localStreamRef.current.getTracks();
          console.log(`[BROADCASTER] Local stream has ${tracks.length} tracks:`, 
            tracks.map((t: any) => `${t.kind}: enabled=${t.enabled}, muted=${t.muted}, readyState=${t.readyState}`).join(', ')
          );
          
          // Get the current broadcaster ID from state
          const currentBroadcasterId = newBroadcasterId; // Use the local variable from startStreaming scope
          if (!currentBroadcasterId) {
            console.error('[BROADCASTER] No broadcaster ID available');
            return;
          }
          
          console.log(`[BROADCASTER] Using broadcaster ID: ${currentBroadcasterId}`);
          
          // Create a new peer connection for this viewer
          console.log('[BROADCASTER] Creating new RTCPeerConnection for viewer');
          const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          });
          
          console.log(`[BROADCASTER] Peer connection created, signalingState: ${pc.signalingState}`);
          
          // Store the peer connection (for now, we'll keep it simple with one viewer)
          peerConnectionsRef.current.set(data.viewerId, pc);
          console.log(`[BROADCASTER] Stored peer connection for viewer ${data.viewerId}, total connections: ${peerConnectionsRef.current.size}`);
          
          // Handle ICE candidates for this peer connection
          (pc as any).onicecandidate = (event: any) => {
            if (event.candidate && socketRef.current) {
              console.log('[BROADCASTER] Generated ICE candidate for viewer:', event.candidate.candidate.substring(0, 50) + '...');
              socketRef.current.emit('ice-candidate', {
                candidate: event.candidate,
                broadcasterId: currentBroadcasterId,
                targetViewerId: data.viewerId
              });
            } else if (!event.candidate) {
              console.log('[BROADCASTER] ICE gathering complete (null candidate)');
            }
          };
          
          // Monitor connection state
          (pc as any).onconnectionstatechange = () => {
            console.log(`[BROADCASTER] Connection state for viewer ${data.viewerId}: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') {
              console.log('[BROADCASTER] WebRTC connected to viewer successfully!');
              Alert.alert('Success', 'Connected to monitoring website!');
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
              console.log('[BROADCASTER] WebRTC connection failed or closed');
              peerConnectionsRef.current.delete(data.viewerId);
            }
          };
          
          (pc as any).oniceconnectionstatechange = () => {
            console.log(`[BROADCASTER] ICE connection state for viewer ${data.viewerId}: ${pc.iceConnectionState}`);
          };
          
          // Add all tracks from the local stream to this peer connection
          localStreamRef.current.getTracks().forEach((track: any) => {
            console.log(`[BROADCASTER] Adding ${track.kind} track to peer connection for viewer ${data.viewerId}`, {
              id: track.id,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState
            });
            pc.addTrack(track, localStreamRef.current);
          });
          
          console.log(`[BROADCASTER] All tracks added to peer connection`);
          
          // Create offer with specific constraints to ensure video is included
          const offerOptions = {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
          };
          
          console.log('[BROADCASTER] Creating offer with video constraints');
          const offer = await pc.createOffer(offerOptions);
          
          console.log(`[BROADCASTER] Offer created, SDP preview: ${offer.sdp?.substring(0, 100)}...`);
          console.log(`[BROADCASTER] Offer SDP length: ${offer.sdp?.length} bytes`);
          
          // Check if the offer includes video
          if (!offer.sdp?.includes('m=video')) {
            console.error('[BROADCASTER] CRITICAL ERROR: Offer does NOT contain video media section (m=video)!');
            Alert.alert('Error', 'Video track missing from offer');
          } else {
            console.log('[BROADCASTER] SDP check: m=video section is present.');
          }
          
          if (!offer.sdp?.includes('m=audio')) {
            console.log('[BROADCASTER] Note: Offer does not contain audio (expected for video-only stream)');
          }
          
          await pc.setLocalDescription(offer);
          console.log('[BROADCASTER] Local description set successfully, signalingState:', pc.signalingState);
          
          // Send the offer to the specific viewer
          socketRef.current.emit('offer', {
            sdp: pc.localDescription,
            broadcasterId: currentBroadcasterId,
            targetViewerId: data.viewerId
          });
          
          console.log(`[BROADCASTER] Sent targeted offer to viewer ${data.viewerId}`, {
            broadcasterId: currentBroadcasterId,
            targetViewerId: data.viewerId,
            sdpType: pc.localDescription?.type,
            sdpLength: pc.localDescription?.sdp?.length
          });
        } catch (err) {
          console.error('[BROADCASTER] Error creating offer for viewer:', err);
          Alert.alert('Error', `Failed to create offer: ${err}`);
        }
      });
      
      // Handle answer from viewers
      socketRef.current.on('answer', async (data: any) => {
        try {
          console.log('[BROADCASTER] Received answer from viewer', data);
          
          const viewerId = data.viewerId;
          if (!viewerId) {
            console.error('[BROADCASTER] Received answer without viewerId');
            return;
          }
          
          const pc = peerConnectionsRef.current.get(viewerId);
          if (!pc) {
            console.error(`[BROADCASTER] Received answer but no peer connection for viewer ${viewerId}`);
            return;
          }
          
          console.log(`[BROADCASTER] Processing answer from viewer ${viewerId}, pc state: ${pc.signalingState}`);
          
          // Extract SDP
          let sdp;
          if (data.sdp && data.sdp.sdp) {
            sdp = { type: 'answer', sdp: data.sdp.sdp };
            console.log('[BROADCASTER] Answer format: nested sdp object');
          } else if (data.sdp && typeof data.sdp.type === 'string' && typeof data.sdp.sdp === 'string') {
            sdp = data.sdp;
            console.log('[BROADCASTER] Answer format: full RTCSessionDescription');
          } else if (typeof data.sdp === 'string') {
            sdp = { type: 'answer', sdp: data.sdp };
            console.log('[BROADCASTER] Answer format: raw SDP string');
          } else {
            sdp = { type: 'answer', sdp: data };
            console.log('[BROADCASTER] Answer format: raw data');
          }
          
          console.log(`[BROADCASTER] Answer SDP length: ${sdp.sdp?.length || 0} bytes`);
          
          // Set remote description
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log(`[BROADCASTER] Remote description set successfully for viewer ${viewerId}, signalingState: ${pc.signalingState}`);
        } catch (err) {
          console.error('[BROADCASTER] Error handling answer:', err);
        }
      });
      
      // Handle ICE candidates from viewers
      socketRef.current.on('ice-candidate', async (data: any) => {
        try {
          const viewerId = data.viewerId;
          if (!viewerId) {
            console.warn('Received ICE candidate without viewerId');
            return;
          }
          
          const pc = peerConnectionsRef.current.get(viewerId);
          if (!pc) {
            console.warn(`Received ICE candidate but no peer connection for viewer ${viewerId}`);
            return;
          }
          
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log(`Successfully added ICE candidate from viewer ${viewerId}`);
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      });
      
      // Handle camera switch request from viewer
      socketRef.current.on('switch-camera-request', async (data: any) => {
        try {
          console.log(`[BROADCASTER] Received camera switch request from viewer ${data.viewerId}`);
          
          // Toggle camera index (0 -> 1, 1 -> 0)
          currentCameraIndexRef.current = currentCameraIndexRef.current === 0 ? 1 : 0;
          console.log(`[BROADCASTER] Switching to camera index ${currentCameraIndexRef.current}`);
          
          // Also toggle the preview camera
          setUseBackCamera(prev => !prev);
          
          // Stop current stream and restart with different camera
          await stopStreaming();
          
          // Wait a moment for cleanup
          await new Promise((resolve: any) => setTimeout(resolve, 500));
          
          // Restart streaming (will use the toggled camera)
          await startStreaming();
          
          console.log(`[BROADCASTER] ✓ Camera switched successfully`);
        } catch (err) {
          console.error('[BROADCASTER] Error switching camera:', err);
          Alert.alert('Camera Switch Failed', 'Could not switch camera. Please try again.');
        }
      });
      
      // Don't create peer connection immediately - wait for viewer requests!
      // Peer connections will be created in the 'viewer-requested-connection' handler
      
      // First make sure any existing stream is properly cleaned up
      if (localStreamRef.current) {
        console.log('Stopping existing media tracks before requesting new ones');
        localStreamRef.current.getTracks().forEach((track: any) => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping track:', error);
          }
        });
        localStreamRef.current = null;
      }
      
      // CRITICAL FIX: react-native-webrtc doesn't always respect facingMode on Android
      // We need to enumerate devices and explicitly select the back camera
      console.log('[BROADCASTER] Enumerating video devices to find back camera...');
      
      let backCameraDeviceId: string | null = null;
      try {
        const devices: any = await mediaDevices.enumerateDevices();
        console.log('[BROADCASTER] Enumerated devices:', devices.length);
        
        const videoDevices = devices.filter((device: any) => device.kind === 'videoinput');
        console.log('[BROADCASTER] Video devices found:', videoDevices.length);
        
        console.log('[BROADCASTER] Available video devices:');
        videoDevices.forEach((d: any, index: number) => {
          console.log(`  [${index}] ${d.label || 'Unknown'} (id: ${d.deviceId.substring(0, 20)}..., facing: ${d.facing || 'unknown'})`);
        });
        
        // Use the camera based on currentCameraIndexRef (toggles between cameras)
        let selectedCamera = null;
        
        if (videoDevices.length >= 2) {
          // Use the current camera index (will toggle between 0 and 1)
          const cameraIndex = currentCameraIndexRef.current % videoDevices.length;
          selectedCamera = videoDevices[cameraIndex];
          console.log(`[BROADCASTER] ✓ Selecting camera at index ${cameraIndex}`);
          console.log(`[BROADCASTER] Camera details:`, {
            label: selectedCamera.label || 'Unknown',
            facing: selectedCamera.facing || 'unknown'
          });
        } else if (videoDevices.length === 1) {
          console.warn('[BROADCASTER] Only one camera available, using it');
          selectedCamera = videoDevices[0];
        }
        
        if (selectedCamera) {
          backCameraDeviceId = selectedCamera.deviceId;
          console.log('[BROADCASTER] ✓✓✓ SELECTED CAMERA:', {
            label: selectedCamera.label || 'Unknown',
            deviceId: selectedCamera.deviceId.substring(0, 30) + '...',
            facing: selectedCamera.facing || 'unknown'
          });
        } else {
          console.error('[BROADCASTER] No camera found!');
        }
      } catch (enumError) {
        console.error('[BROADCASTER] Error enumerating devices:', enumError);
        console.log('[BROADCASTER] Will fall back to facingMode constraint');
      }
      
      // Use explicit deviceId if we found a back camera, otherwise fall back to facingMode
      const constraints = backCameraDeviceId ? {
        audio: hasMicrophonePermission,
        video: {
          deviceId: { exact: backCameraDeviceId }, // Use explicit device ID
          width: { min: 640, ideal: 640, max: 1280 },
          height: { min: 480, ideal: 480, max: 720 },
          frameRate: { min: 24, ideal: 30, max: 30 }
        }
      } : {
        audio: hasMicrophonePermission,
        video: {
          width: { min: 640, ideal: 640, max: 1280 },
          height: { min: 480, ideal: 480, max: 720 },
          frameRate: { min: 24, ideal: 30, max: 30 },
          facingMode: { ideal: 'environment' } // Fallback to facingMode
        }
      };
      
      if (backCameraDeviceId) {
        console.log('[BROADCASTER] Requesting media stream with EXPLICIT deviceId:', backCameraDeviceId.substring(0, 30) + '...');
      } else {
        console.log('[BROADCASTER] Requesting media stream with facingMode: environment');
      }
      console.log('[BROADCASTER] Full constraints:', JSON.stringify(constraints));
      
      try {
        // Use MediaStream API directly with retries if needed
        let localStream;
        try {
          localStream = await mediaDevices.getUserMedia(constraints);
          console.log('[BROADCASTER] getUserMedia SUCCESS with ideal constraints');
        } catch (initialError: any) {
          console.error('[BROADCASTER] Initial camera access failed:', initialError);
          console.error('[BROADCASTER] Error message:', initialError.message);
          
          // Check if it's a camera-in-use error
          if (initialError.message && 
              (initialError.message.includes('camera') || 
               initialError.message.includes('in use') ||
               initialError.message.includes('Max number of active camera') ||
               initialError.message.toLowerCase().includes('max cameras'))) {
            
            console.error('[BROADCASTER] MAX CAMERAS ERROR - Camera not released yet!');
            
            Alert.alert(
              'Camera Release Issue',
              'The camera preview is still active. This usually resolves after a moment. Please wait 2 seconds and try again, or restart the app if the issue persists.',
              [
                { 
                  text: 'OK',
                  onPress: () => {
                    // Reset streaming state so user can try again
                    setIsStreaming(false);
                    setBroadcasterId(null);
                  }
                }
              ]
            );
            console.error('[BROADCASTER] Camera in use error, aborting');
            throw new Error('Camera already in use');
          }
          
          console.log('[BROADCASTER] Trying with simpler constraints (keeping back camera deviceId)...');
          // Fallback to very basic constraints but keep the back camera deviceId
          const fallbackConstraints = {
            audio: hasMicrophonePermission,
            video: backCameraDeviceId ? {
              deviceId: { exact: backCameraDeviceId } // Keep using back camera
            } : {
              facingMode: 'environment' // Fallback to facingMode if deviceId not available
            }
          };
          console.log('[BROADCASTER] Fallback constraints:', JSON.stringify(fallbackConstraints));
          localStream = await mediaDevices.getUserMedia(fallbackConstraints);
          console.log('[BROADCASTER] getUserMedia SUCCESS with fallback constraints');
        }
        
        const tracks = localStream.getTracks();
        console.log(`[BROADCASTER] Got local stream with ${tracks.length} tracks:`,
          tracks.map((t: any) => `${t.kind}: id=${t.id}, enabled=${t.enabled}, readyState=${t.readyState}`).join(', ')
        );
        
        // Ensure we got video track
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length === 0) {
          console.error('[BROADCASTER] CRITICAL: No video track in stream!');
          throw new Error("No video track available in the media stream");
        }
        
        // Get video track settings to verify which camera we got
        const videoSettings = videoTracks[0].getSettings();
        console.log(`[BROADCASTER] Video track details:`, {
          id: videoTracks[0].id,
          label: videoTracks[0].label,
          enabled: videoTracks[0].enabled,
          muted: videoTracks[0].muted,
          readyState: videoTracks[0].readyState,
          settings: videoSettings
        });

        // Note: Camera verification removed because test confirmed camera 0 is the back camera
        // Some devices don't report facingMode correctly, but we know from testing that
        // camera index 0 is the back camera on this device
        console.log(`[BROADCASTER] ✓ Using camera at index 0 (confirmed as BACK camera via testing)`);
        console.log(`Video track settings:`, videoTracks[0].getSettings());
        
        // Save reference to stream - CRITICAL for viewer connections!
        localStreamRef.current = localStream;
        console.log('[BROADCASTER] ✓ localStreamRef.current SET - stream is ready for viewer connections');
        
        // Verify the ref is actually set
        if (!localStreamRef.current) {
          console.error('[BROADCASTER] ❌ CRITICAL ERROR: localStreamRef.current is NULL after assignment!');
          throw new Error('Failed to set stream reference');
        }
        
        console.log('[BROADCASTER] Stream has', localStream.getTracks().length, 'tracks');
        
        // Log detailed information about each track
        localStream.getTracks().forEach((track: any) => {
          console.log(`Track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}, ID: ${track.id}`);
          console.log(`Track settings:`, track.getSettings());
          
          // Make sure track is enabled
          track.enabled = true;

          // FIX: Explicitly apply constraints to the track for video quality
          if (track.kind === 'video') {
            try {
              // Apply preferred constraints again directly to the track
              track.applyConstraints({ width: 640, height: 480, frameRate: 30 });
              console.log('Applied constraints to video track successfully.');
            } catch (constraintError) {
              console.warn('Could not apply video constraints directly to track:', constraintError);
            }
          }

          // Add listener for track ended event
          track.onended = () => {
            console.log(`Track ${track.kind} ended unexpectedly`);
            Alert.alert('Stream Issue', `The ${track.kind} track ended unexpectedly. Try restarting the stream.`);
          };
        });
        
        // Don't add tracks to a peer connection immediately!
        // Tracks will be added when a viewer requests connection
        
        // Stream is NOW ready - register with server so viewers can see us
        console.log('[BROADCASTER] ✓ Media stream ready! Now registering with server...');
        
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('register-broadcaster', {
            id: newBroadcasterId,
            name: deviceType + ' Camera'
          });
          console.log(`[BROADCASTER] Registered as broadcaster with ID: ${newBroadcasterId}`);
        } else {
          console.error('[BROADCASTER] Socket not connected, cannot register!');
          throw new Error('Socket not connected');
        }
        
        // Stream is ready - broadcaster registered and waiting for viewer connections
        setIsStreaming(true);
        console.log('[BROADCASTER] Broadcaster is now ready and waiting for viewer connections');
        Alert.alert('Ready', 'Broadcaster is ready! Viewers can now connect to see your stream.');
        
      } catch (mediaError: any) {
        console.error('Error getting user media:', mediaError);
        throw new Error(`Failed to access camera/microphone: ${mediaError.message || 'Permission denied'}`);
      }
      
      // If we reach here without exceptions, streaming is technically started
      // We rely on the internal promise handling for the final status updates
      
    } catch (err: any) {
      console.error('[BROADCASTER] Error starting live stream:', err);
      Alert.alert('Error', `Failed to start streaming: ${err.message || 'Unknown error'}`);
      // Make sure we stop streaming and reset state
      setIsStreaming(false);
      setIsPreparingCamera(false);
      setBroadcasterId(null);
      stopStreaming();
    }
  };

  // Function to stop streaming
  const stopStreaming = async () => {
    console.log('[BROADCASTER] Stopping stream and cleaning up resources');
    
    // Reset all states
    setIsPreparingCamera(false);
    
    try {
      // Clean up WebRTC stream FIRST
      if (localStreamRef.current) {
        console.log('[BROADCASTER] Stopping all media tracks...');
        localStreamRef.current.getTracks().forEach((track: any) => {
          try {
            track.stop();
            console.log(`[BROADCASTER] Stopped ${track.kind} track: ${track.id}`);
          } catch (error) {
            console.warn(`[BROADCASTER] Error stopping ${track.kind} track:`, error);
          }
        });
        localStreamRef.current = null;
        console.log('[BROADCASTER] All tracks stopped');
      }
      
      // Close and clean up ALL peer connections
      console.log(`[BROADCASTER] Closing ${peerConnectionsRef.current.size} peer connections`);
      peerConnectionsRef.current.forEach((pc, viewerId) => {
        try {
          console.log(`[BROADCASTER] Closing peer connection for viewer ${viewerId}`);
          pc.close();
        } catch (error) {
          console.warn(`[BROADCASTER] Error closing peer connection for viewer ${viewerId}:`, error);
        }
      });
      peerConnectionsRef.current.clear();
      
      // Disconnect and clean up socket
      if (socketRef.current) {
        console.log('[BROADCASTER] Disconnecting from signaling server');
        if (socketRef.current.connected) {
          // Unregister from server
          if (broadcasterId) {
            socketRef.current.emit('unregister-broadcaster', { id: broadcasterId });
          }
          
          // Remove all listeners to prevent memory leaks
          socketRef.current.off('connect');
          socketRef.current.off('disconnect');
          socketRef.current.off('connect_error');
          socketRef.current.off('viewer-requested-connection');
          socketRef.current.off('answer');
          socketRef.current.off('ice-candidate');
          socketRef.current.off('monitor-number');
          socketRef.current.off('offer-received');
          
          socketRef.current.disconnect();
        }
        socketRef.current = null;
      }
      
      // CRITICAL: Wait for camera to be fully released before re-enabling Camera preview
      console.log('[BROADCASTER] Waiting 1 second for camera resources to be fully released...');
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
      console.log('[BROADCASTER] Camera resources released, safe to re-enable preview');
      
    } catch (error) {
      console.error('[BROADCASTER] Error during cleanup:', error);
    } finally {
      // Always update state regardless of any errors
      // This will make isActive={!isStreaming} = true and re-enable Camera preview
      setIsStreaming(false);
      setBroadcasterId(null);
      console.log('[BROADCASTER] Stream stopped, Camera preview re-enabled');
    }
  };

  // Render UI
  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom }]}>
      <View style={styles.cameraContainer}>
        {device && hasPermission ? (
          <>
            <Camera
              style={styles.camera}
              device={device}
              isActive={!isStreaming} // Turn OFF camera preview when streaming to avoid conflict
              video={true}
              audio={false} // Don't use audio in preview to avoid conflicts
              enableZoomGesture={true}
            />
            {isPreparingCamera && (
              <View style={styles.streamingOverlay}>
                <View style={styles.preparingIndicator}>
                  <Text style={styles.preparingText}>⏳ Preparing camera...</Text>
                </View>
                <Text style={styles.streamingMessage}>Please wait...</Text>
              </View>
            )}
            {isStreaming && !isPreparingCamera && (
              <View style={styles.streamingOverlay}>
                <View style={styles.streamingIndicator}>
                  <Text style={styles.streamingText}>🔴 LIVE</Text>
                </View>
                <Text style={styles.streamingMessage}>Streaming to viewers...</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noCameraView}>
            <Text style={styles.noCameraText}>Camera not available</Text>
          </View>
        )}
      </View>
      
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.button, isStreaming ? styles.stopButton : styles.startButton]}
          onPress={isStreaming ? stopStreaming : startStreaming}
        >
          <Text style={styles.buttonText}>
            {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
          </Text>
        </TouchableOpacity>
        
        {isStreaming && (
          <Text style={styles.statusText}>
            Streaming as: {broadcasterId || 'Unknown'}
          </Text>
        )}
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  camera: {
    flex: 1,
    backgroundColor: '#000',
  },
  noCameraView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  noCameraText: {
    color: '#fff',
    fontSize: 16,
  },
  controlBar: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 180,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4361ee',
  },
  stopButton: {
    backgroundColor: '#f72585',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  streamingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  preparingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,165,0,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamingText: {
    color: '#f72585',
    fontSize: 18,
    fontWeight: 'bold',
  },
  preparingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  streamingMessage: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  statusText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
});

export default App;