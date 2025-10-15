/**
 * HackChronoApp with WebRTC Streaming
 * 
 * @format
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
const SIGNALING_SERVER_URL = 'http://192.168.220.54:3000';

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
      socketRef.current = io(SIGNALING_SERVER_URL);
      console.log('🔌 Connected to signaling server');

      // Create PeerConnection
      pcRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Handle local ICE candidates
      pcRef.current.onicecandidate = (event: any) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', event.candidate);
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
      
      socketRef.current.emit('offer', pcRef.current.localDescription);

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
          
          // Create proper RTCSessionDescription
          const rtcAnswer = new RTCSessionDescription(answer);
          await pcRef.current.setRemoteDescription(rtcAnswer);
          console.log('Remote description set successfully');
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      });

      // Handle incoming ICE candidate
      socketRef.current.on('ice-candidate', async (candidate: any) => {
        try {
          if (!pcRef.current) {
            console.log('No peer connection when receiving ICE candidate');
            return;
          }
          
          const iceCandidate = new RTCIceCandidate(candidate);
          await pcRef.current.addIceCandidate(iceCandidate);
          console.log('Added ICE candidate successfully');
        } catch (err) {
          console.error('❌ Error adding ICE candidate:', err);
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
            Camera is streaming to viewers
          </Text>
        </View>
      )}
      
      {/* Streaming indicator */}
      {isStreaming && (
        <View style={styles.streamingIndicator}>
          <Text style={styles.streamingText}>LIVE</Text>
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
