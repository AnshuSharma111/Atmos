/**
 * Simple Broadcaster App
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  TouchableOpacity,
  Text,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

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

// Replace with your signaling server's IP address or domain
// Make sure this is pointing to your actual server IP
// NOTE: "localhost" or "127.0.0.1" won't work from a physical device!
// Use your computer's actual LAN IP address
// UPDATED: Port 3001 matches server configuration in server.js
const SIGNALING_SERVER_URL = 'http://192.168.220.54:3001'; 

// Important: If your device can't connect, double-check this IP address
// It must match your computer's actual IP address on the network
console.log('Connecting to signaling server at:', SIGNALING_SERVER_URL);

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [isCameraStreamingMode, setIsCameraStreamingMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [broadcasterId, setBroadcasterId] = useState<string | null>(null);
  const [monitorNumber, setMonitorNumber] = useState<number | null>(null);
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  // WebRTC-related refs
  const socketRef = useRef<any>(null);
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);

  useEffect(() => {
    // Request camera permission
    if (!hasPermission) {
      requestPermission();
    }

    // Request microphone permission
    const requestMicrophonePermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'HackChronoApp needs access to your microphone for live streaming',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setHasMicrophonePermission(true);
          }
        } catch (err) {
          console.error('Microphone permission error:', err);
        }
      } else {
        setHasMicrophonePermission(true);
      }
    };

    requestMicrophonePermission();
    
    // Cleanup function
    return () => {
      console.log('Component unmounting, cleaning up resources');
      
      // Clean up media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: any) => {
          console.log(`Stopping ${track.kind} track on unmount`);
          track.stop();
        });
      }
      
      // Close socket connection
      if (socketRef.current) {
        console.log('Disconnecting socket on unmount');
        socketRef.current.disconnect();
      }
      
      // Close peer connection
      if (pcRef.current) {
        console.log('Closing peer connection on unmount');
        pcRef.current.close();
      }
      
      // Reset all refs
      localStreamRef.current = null;
      socketRef.current = null;
      pcRef.current = null;
    };
  }, [hasPermission, requestPermission]);

  const handleGoLive = async () => {
    if (!hasPermission || !hasMicrophonePermission) {
      Alert.alert('Permissions Missing', 'Camera and microphone permissions are required.');
      return;
    }

    try {
      // First, we need to check if we already have a socket connection or peer connection
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      
      // First set streaming mode to true which will disable the Camera component
      // This avoids the "camera already in use" error
      setIsStreaming(true);
      
      // Small delay to ensure Camera component is properly unmounted
      await new Promise<void>(resolve => setTimeout(() => resolve(), 500));

      // Connect to signaling server
      // Connect with more robust configuration
      socketRef.current = io(SIGNALING_SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000, // 20 second timeout (increased for reliability)
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: true,
        autoConnect: true
      });
      console.log('🔌 Connecting to signaling server at', SIGNALING_SERVER_URL);
      
      // Add connection event handlers
      socketRef.current.on('connect', () => {
        console.log('🔌 Successfully connected to signaling server');
      });
      
      socketRef.current.on('connect_error', (error: Error) => {
        console.error('❌ Socket connection error:', error);
        Alert.alert('Connection Error', 
          `Could not connect to the server (${error.message}). Please check your network and server address.`,
          [
            { text: 'Retry', onPress: () => socketRef.current?.connect() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      });

      // Add a unique identifier for this broadcaster
      const deviceType = Platform.OS === 'ios' ? 'iOS' : 'Android';
      const newBroadcasterId = deviceType + '_' + Math.random().toString(36).substring(2, 10);
      const deviceName = deviceType + ' Camera';
      setBroadcasterId(newBroadcasterId);
      
      // Make sure the socket is connected before registering
      if (socketRef.current.connected) {
        console.log(`🔌 Registering as broadcaster with ID: ${newBroadcasterId}`);
        socketRef.current.emit('register-broadcaster', { id: newBroadcasterId, name: deviceName });
      } else {
        console.log(`⏳ Waiting for socket connection before registering...`);
        socketRef.current.on('connect', () => {
          console.log(`🔌 Socket connected, now registering as broadcaster with ID: ${newBroadcasterId}`);
          socketRef.current.emit('register-broadcaster', { id: newBroadcasterId, name: deviceName });
        });
      }
      
      // Handle monitor number assignment
      socketRef.current.on('monitor-number', (data: { broadcasterId: string, number: number }) => {
        if (data.broadcasterId === newBroadcasterId) {
          console.log(`📺 Assigned Monitor Number: ${data.number}`);
          setMonitorNumber(data.number);
        }
      });

      // Create PeerConnection
      pcRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Handle local ICE candidates
      pcRef.current.onicecandidate = (event: any) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
          
          // Send the complete candidate object with all properties
          socketRef.current.emit('ice-candidate', {
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment
            },
            broadcasterId: broadcasterId
          });
        }
      };
      
      // For this simplified version, we'll use a direct approach with the device
      if (!device) {
        throw new Error('Camera device not available');
      }
      
      // Mark that we're in streaming mode
      setIsCameraStreamingMode(true);
      
      // Use getUserMedia to access the camera directly
      // Now that the Camera component is inactive, we can use getUserMedia
      const constraints = {
        audio: hasMicrophonePermission,
        video: {
          deviceId: device.id,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        }
      };
      
      console.log('Getting user media with constraints:', JSON.stringify(constraints));
      const localStream = await mediaDevices.getUserMedia(constraints);
      console.log('Got local stream with tracks:', localStream.getTracks().length);
      
      // Store the local stream in a ref for later cleanup
      localStreamRef.current = localStream;
      
      console.log('Local stream tracks:', localStream.getTracks().map(t => t.kind).join(', '));
      
      // Add tracks to connection
      localStream.getTracks().forEach((track: any) => {
        console.log('Adding track to peer connection:', track.kind, 'enabled:', track.enabled);
        
        // Make sure video tracks are enabled
        if (track.kind === 'video') {
          track.enabled = true;
        }
        
        // Add the track to the peer connection
        const sender = pcRef.current.addTrack(track, localStream);
        console.log('Added track, got sender:', sender ? 'yes' : 'no');
      });

      // Monitor tracks for debugging
      pcRef.current.ontrack = (event: any) => {
        console.log('Track added to peer connection:', event.track.kind);
      };

      // Set up negotiation needed handler
      pcRef.current.onnegotiationneeded = async () => {
        try {
          console.log('Negotiation needed, creating offer...');
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          console.log('📡 Sending offer to signaling server:', JSON.stringify(offer).substring(0, 100) + '...');
          socketRef.current.emit('offer', pcRef.current.localDescription);
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      };

      // Add a small delay to ensure tracks are properly added
      await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
      
      // Check that we have senders
      const senders = pcRef.current.getSenders();
      console.log(`We have ${senders.length} sender(s):`);
      senders.forEach((sender: any, i: number) => {
        const trackInfo = sender.track ? 
          `${sender.track.kind} track (enabled: ${sender.track.enabled})` : 
          'no track';
        console.log(`Sender ${i}: ${trackInfo}`);
      });
      
      // Manually trigger negotiation after adding tracks
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      console.log('📡 Sent offer to signaling server');
      
      // Check if the SDP contains video and audio sections
      const sdp = pcRef.current.localDescription.sdp;
      const hasVideo = sdp.includes('m=video');
      const hasAudio = sdp.includes('m=audio');
      console.log(`Offer SDP contains: ${hasVideo ? '✓' : '✗'} video, ${hasAudio ? '✓' : '✗'} audio`);
      
      // Send the offer to all viewers through the server
      console.log(`📤 Sending offer to signaling server with broadcaster ID: ${broadcasterId}`);
      socketRef.current.emit('offer', {
        sdp: pcRef.current.localDescription,
        broadcasterId: broadcasterId
      });

      // Handle incoming answer
      socketRef.current.on('answer', async (answer: any) => {
        console.log('📨 Received answer:', JSON.stringify(answer).substring(0, 100) + '...');
        try {
          // Check if peer connection still exists
          if (!pcRef.current) {
            console.log('No peer connection when receiving answer');
            return;
          }
          
          // Check the signaling state
          const currentState = pcRef.current.signalingState;
          console.log('Current signaling state:', currentState);
          
          // Extract the SDP from whatever format it comes in
          const sdp = answer.sdp || answer.answer || answer;
          
          if (!sdp || !sdp.type || !sdp.sdp) {
            console.error('Invalid answer format:', JSON.stringify(answer));
            return;
          }
          
          // Create proper RTCSessionDescription
          const rtcAnswer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdp.sdp
          });
          
          await pcRef.current.setRemoteDescription(rtcAnswer);
          console.log('Remote description set successfully');
        } catch (err) {
          console.error('Error setting remote description:', err);
          
          // Log detailed error info to help with debugging
          console.log('Answer format received:', answer);
          if (typeof answer === 'object') {
            console.log('Answer keys:', Object.keys(answer));
          }
        }
      });

      // Handle incoming ICE candidate
      socketRef.current.on('ice-candidate', async (data: any) => {
        try {
          if (!pcRef.current) {
            console.log('No peer connection when receiving ICE candidate');
            return;
          }
          
          // Extract the ICE candidate from whatever format it comes in
          const candidateData = data.candidate || data;
          
          console.log('Received ICE candidate data:', JSON.stringify(candidateData).substring(0, 100));
          
          // Make sure we have a valid ICE candidate with at least one identifier
          if (!candidateData || (candidateData.sdpMLineIndex === null && !candidateData.sdpMid)) {
            console.warn('Skipping invalid ICE candidate - missing both sdpMLineIndex and sdpMid');
            return;
          }
          
          // Create a complete candidate object with default values if needed
          const completeCandidate = {
            candidate: candidateData.candidate || '',
            sdpMLineIndex: candidateData.sdpMLineIndex !== undefined ? candidateData.sdpMLineIndex : 0,
            sdpMid: candidateData.sdpMid || '0',
            usernameFragment: candidateData.usernameFragment
          };
          
          // Create proper RTCIceCandidate
          const iceCandidate = new RTCIceCandidate(completeCandidate);
          await pcRef.current.addIceCandidate(iceCandidate);
          console.log('Added ICE candidate successfully');
        } catch (err) {
          console.error('❌ Error adding ICE candidate:', err);
          // Log more details for debugging
          console.log('Candidate data received:', data);
        }
      });

      // Set up connection state monitoring
      pcRef.current.onconnectionstatechange = () => {
        // Check if peer connection still exists
        if (!pcRef.current) {
          console.log('Connection state change event but pcRef is null');
          return;
        }
        
        console.log(`Connection state changed: ${pcRef.current.connectionState}`);
        
        if (pcRef.current.connectionState === 'connected') {
          console.log('WebRTC connected successfully!');
        } else if (pcRef.current.connectionState === 'failed' || 
                  pcRef.current.connectionState === 'closed') {
          console.log('WebRTC connection failed or closed');
          if (isStreaming) {
            Alert.alert('Connection Lost', 'The streaming connection was lost. Please try again.');
            setIsStreaming(false);
          }
        }
      };
      
      // Set streaming state to true
      setIsStreaming(true);
      
      Alert.alert('Live', 'Streaming started! You can now view the stream in the browser.');
    } catch (error) {
      const err = error as Error; // Type assertion
      console.error('Error starting live stream:', err);
      Alert.alert('Error', `Failed to start streaming: ${err.message || 'Unknown error'}`);
      setIsCameraStreamingMode(false);
    }
  };

  if (!device) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No camera device available</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {/* Show camera preview only when not streaming */}
      {!isStreaming && (
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={!isStreaming} // Only active when not streaming
          audio={false} // Only use audio for WebRTC streaming
          video={true}
        />
      )}
      
      {/* When streaming, show a placeholder */}
      {isStreaming && (
        <View style={[styles.camera, styles.streamingBackground]}>
          <Text style={styles.streamingPlaceholderText}>
            {monitorNumber 
              ? `Camera is streaming as Monitor ${monitorNumber}` 
              : 'Camera is streaming to viewers'}
          </Text>
        </View>
      )}
      
      {/* Streaming indicator */}
      {isStreaming && (
        <View style={styles.streamingIndicator}>
          <Text style={styles.streamingText}>
            {monitorNumber ? `LIVE - Monitor ${monitorNumber}` : 'LIVE'}
          </Text>
        </View>
      )}
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.goLiveButton, isStreaming && styles.stopButton]}
          onPress={isStreaming ? () => {
            // Stop streaming - safely cleanup resources
            try {
              // Stop all media tracks first from localStreamRef
              if (localStreamRef.current) {
                console.log('Stopping all tracks in localStream');
                localStreamRef.current.getTracks().forEach((track: any) => {
                  console.log(`Stopping ${track.kind} track`);
                  track.stop();
                });
                localStreamRef.current = null;
              }
              
              // Close peer connection
              if (pcRef.current) {
                console.log('Closing peer connection');
                pcRef.current.close();
                pcRef.current = null;
              }
              
              // Disconnect the socket
              if (socketRef.current) {
                console.log('Disconnecting socket');
                socketRef.current.disconnect();
                socketRef.current = null;
              }
            } catch (err) {
              console.error('Error while stopping stream:', err);
            } finally {
              // Always update state
              setIsCameraStreamingMode(false);
              setIsStreaming(false);
            }
          } : handleGoLive}
        >
          <Text style={styles.goLiveButtonText}>
            {isStreaming ? 'Stop Live' : 'Go Live'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    alignItems: 'center',
  },
  goLiveButton: {
    backgroundColor: 'red',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 30,
    elevation: 5,
  },
  stopButton: {
    backgroundColor: '#555',
  },
  goLiveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    elevation: 5,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  streamingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'red',
    borderRadius: 5,
    padding: 8,
    opacity: 0.8,
  },
  streamingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  streamingBackground: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamingPlaceholderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
