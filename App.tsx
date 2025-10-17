/**
 * Atmos - Emission Monitoring System
 * Mobile broadcaster for real-time environmental monitoring
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
import AppConfig from './app.config';

// Register WebRTC globals
registerGlobals();

// Use configuration from app.config.js
const SIGNALING_SERVER_URL = AppConfig.serverUrl;
const ICE_SERVERS = AppConfig.iceServers;

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
  
  // Always use the back camera - THIS WORKS!
  const device = useCameraDevice('back'); 
  const cameraRef = useRef<Camera>(null);
  
  // WebRTC-related refs
  const socketRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, any>>(new Map()); // Map of viewerId -> RTCPeerConnection
  const localStreamRef = useRef<any>(null);
  const frameIntervalRef = useRef<any>(null);

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
        const micPermission = await mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (micPermission) {
          setHasMicrophonePermission(true);
          micPermission.getTracks().forEach((track: any) => track.stop());
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
    console.warn('🚀🚀🚀🚀🚀 START STREAMING CALLED 🚀🚀🚀🚀🚀');
    
    if (!device || !hasPermission) {
      console.error('[BROADCASTER] Cannot start - no device or permission');
      Alert.alert('Error', 'Camera permission not granted or device not available');
      return;
    }

    try {
      console.warn('🔧 [BROADCASTER] Starting streaming process...');
      
      // Clean up any existing connections
      await stopStreaming();
      console.warn('🔧 [BROADCASTER] Previous stream stopped');
      
      // STEP 1: Disable Camera component to release hardware
      console.warn('🔧 [BROADCASTER] Disabling Camera component...');
      setIsPreparingCamera(true);
      
      // STEP 2: Wait 2 seconds for Camera to fully release the hardware
      console.warn('🔧 [BROADCASTER] Waiting 2 seconds for camera hardware release...');
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
      console.warn('🔧 [BROADCASTER] Camera should be released now');
      
      // STEP 3: Now set streaming to true (Camera stays off during streaming)
      setIsStreaming(true);
      
      setIsPreparingCamera(false);
      
      // Create unique broadcaster ID
      const deviceType = Platform.OS === 'ios' ? 'iOS' : 'Android';
      const newBroadcasterId = deviceType + '_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString().slice(-6);
      setBroadcasterId(newBroadcasterId);
      
      // Disconnect any existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Connect to signaling server
      console.warn(`🔧 [DEBUG] Connecting to signaling server at ${SIGNALING_SERVER_URL}`);
      socketRef.current = io(SIGNALING_SERVER_URL, AppConfig.socketConfig);

      // CRITICAL FIX: Wait for socket to connect
      await new Promise<void>((resolve, reject) => {
        const connectionTimeout = setTimeout(() => {
          reject(new Error('Socket connection timeout after 60 seconds. Server may be sleeping - try again.'));
        }, 60000); 
        
        socketRef.current.on('connect', () => {
          clearTimeout(connectionTimeout);
          resolve();
        });
        
        socketRef.current.on('connect_error', (error: any) => {
          clearTimeout(connectionTimeout);
          console.error('Socket connection error:', error);
          Alert.alert('Connection Error', `Cannot connect to streaming server.\n\nError: ${error.message}`);
          reject(error);
        });
      });
      
      // Set up remaining socket event handlers
      socketRef.current.on('monitor-number', (data: {broadcasterId: string, number: number}) => {
        if (data.broadcasterId === newBroadcasterId) {
          // Monitor number assigned
        }
      });
      
      socketRef.current.on('disconnect', (reason: string) => {
        if (isStreaming) {
          Alert.alert('Connection Lost', 'Lost connection to the streaming server');
        }
      });
      
      // --- START: WebRTC SDP/ICE Signaling Handlers ---

      // Handle viewer connection requests
      socketRef.current.on('viewer-requested-connection', async (data: any) => {
        try {
          if (!localStreamRef.current) {
            console.error('Cannot send offer - stream not ready');
            Alert.alert('Error', 'Camera stream not ready');
            return;
          }
          
          const currentBroadcasterId = newBroadcasterId;
          
          const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          });
          
          peerConnectionsRef.current.set(data.viewerId, pc);
          
          // Handle ICE candidates
          (pc as any).onicecandidate = (event: any) => {
            if (event.candidate && socketRef.current) {
              socketRef.current.emit('ice-candidate', {
                candidate: event.candidate,
                broadcasterId: currentBroadcasterId,
                targetViewerId: data.viewerId
              });
            }
          };
          
          // Monitor connection state
          (pc as any).onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
              Alert.alert('Success', 'Connected to monitoring website!');
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
              peerConnectionsRef.current.delete(data.viewerId);
            }
          };
          
          // Add all tracks from the local stream to this peer connection
          localStreamRef.current.getTracks().forEach((track: any) => {
            pc.addTrack(track, localStreamRef.current);
          });
          
          const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
          
          if (!offer.sdp?.includes('m=video')) {
            console.error('CRITICAL: Offer does NOT contain video media section!');
          }
          
          await pc.setLocalDescription(offer);
          
          // Send the offer to the specific viewer
          socketRef.current.emit('offer', {
            sdp: pc.localDescription,
            broadcasterId: currentBroadcasterId,
            targetViewerId: data.viewerId
          });
          
        } catch (err) {
          console.error('[BROADCASTER] Error creating offer for viewer:', err);
          Alert.alert('Error', `Failed to create offer: ${err}`);
        }
      });
      
      // Handle answer from viewers
      socketRef.current.on('answer', async (data: any) => {
        try {
          const viewerId = data.viewerId;
          const pc = peerConnectionsRef.current.get(viewerId);
          if (!pc) return;
          
          let sdp = data.sdp;
          if (sdp && sdp.sdp) { sdp = { type: 'answer', sdp: sdp.sdp }; } 
          else if (typeof sdp === 'string') { sdp = { type: 'answer', sdp: sdp }; }

          if (sdp.type !== 'answer') {
             console.error('Invalid SDP type received for answer:', sdp.type);
             return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      });
      
      // Handle ICE candidates from viewers
      socketRef.current.on('ice-candidate', async (data: any) => {
        try {
          const viewerId = data.viewerId;
          const pc = peerConnectionsRef.current.get(viewerId);
          if (!pc) return;
          
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      });
      
      // --- END: WebRTC SDP/ICE Signaling Handlers ---
      
      // Reset any old tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: any) => track.stop());
        localStreamRef.current = null;
      }
      
      // Acquire camera stream using explicit device ID
      let localStream: any;
      
      try {
        const backCameraId = device?.id || '0';
        localStream = await mediaDevices.getUserMedia({
          audio: hasMicrophonePermission,
          video: {
            deviceId: { exact: backCameraId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          }
        });
        
      } catch (mediaError: any) {
        console.error('[BROADCASTER] Failed to access camera:', mediaError.message);
        throw new Error(`Camera access failed: ${mediaError.message}`);
      }

      if (!localStream) {
        throw new Error('Failed to acquire media stream');
      }
      
      // Save reference to stream
      localStreamRef.current = localStream;

      // Final track configuration
      localStream.getTracks().forEach((track: any) => {
        track.enabled = true;
        if (track.kind === 'video') {
          try {
            track.applyConstraints({ width: 640, height: 480, frameRate: 30 });
          } catch (constraintError) {
            console.warn('Could not apply video constraints:', constraintError);
          }
        }
        track.onended = () => {
          Alert.alert('Stream Issue', `The ${track.kind} track ended unexpectedly. Try restarting the stream.`);
        };
      });
      
      // Stream is ready - register with server
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('register-broadcaster', {
          id: newBroadcasterId,
          name: deviceType + ' Camera'
        });
      } else {
        throw new Error('Socket not connected, cannot register!');
      }
      
      setIsStreaming(true);
      Alert.alert('Ready', 'Broadcaster is ready! Viewers can now connect to see your stream.');
      
    } catch (err: any) {
      console.error('Error starting live stream:', err);
      Alert.alert('Error', `Failed to start streaming: ${err.message || 'Unknown error'}`);
      // Clean up resources and reset state upon failure
      setIsStreaming(false);
      setIsPreparingCamera(false);
      setBroadcasterId(null);
      stopStreaming(); // Ensure a final cleanup
    }
  };

  // Function to stop streaming
  const stopStreaming = async () => {
    try {
      // Stop all WebRTC tracks first
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        tracks.forEach((track: any) => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping track:', error);
          }
        });
        localStreamRef.current = null;
      }
      
      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch (error) {
          console.warn('Error closing peer connection:', error);
        }
      });
      peerConnectionsRef.current.clear();
      
      // Disconnect socket
      if (socketRef.current) {
        if (socketRef.current.connected) {
          if (broadcasterId) {
            socketRef.current.emit('unregister-broadcaster', { id: broadcasterId });
          }
          socketRef.current.off(); 
          socketRef.current.disconnect();
        }
        socketRef.current = null;
      }
      
      // Wait for camera hardware to release
      await new Promise<void>(resolve => setTimeout(() => resolve(), 3000));
      
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      // STEP 5: Now update state to re-enable Camera component
      setIsStreaming(false);
      setIsPreparingCamera(false);
      setBroadcasterId(null);
      console.log('[BROADCASTER] ✅ State updated, Camera component should reactivate');
    }
  };

  // Remove frame streaming loop - we're back to pure WebRTC
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, []);

  // Render UI
  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom }]}>
      <View style={styles.cameraContainer}>
        {device && hasPermission ? (
          <>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={!isStreaming && !isPreparingCamera} // ONLY active when NOT streaming
              video={true}
              photo={true}
              audio={false}
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
            {isStreaming ? '🛑 STOP BROADCAST 🛑' : '🚀 START BROADCAST NOW 🚀'}
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