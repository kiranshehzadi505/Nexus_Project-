// Video Call Implementation using WebRTC
let localStream = null;
let peerConnection = null;
let socket = null;
let currentRoomId = null;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// Initialize Socket.IO
function initVideoCall() {
    // Connect to signaling server
    socket = io('https://your-backend.onrender.com'); // REPLACE WITH YOUR BACKEND URL
    
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
}

// Create Room
async function createRoom() {
    const roomId = Math.random().toString(36).substring(2, 10);
    currentRoomId = roomId;
    document.getElementById('room-id-input').value = roomId;
    await joinRoom(roomId, true);
    showToast(`Room created: ${roomId}`, 'success');
}

// Join Room
async function joinRoom(roomId, isCreator = false) {
    if (!roomId) {
        roomId = document.getElementById('room-id-input')?.value;
        if (!roomId) {
            showToast('Please enter a room ID', 'error');
            return;
        }
    }
    
    currentRoomId = roomId;
    
    try {
        // Get local media
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = localStream;
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) remoteVideo.srcObject = event.streams[0];
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, roomId: currentRoomId });
            }
        };
        
        // Join room via socket
        socket.emit('join-room', { roomId: currentRoomId, userId: currentUser.id });
        
        // If not creator, create and send offer
        if (!isCreator) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { offer: offer, roomId: currentRoomId });
        }
        
        document.getElementById('call-controls')?.classList.remove('hidden');
        showToast('Connected to call room', 'success');
        
    } catch (error) {
        console.error('Error joining call:', error);
        showToast('Could not access camera/microphone', 'error');
    }
}

// Leave Call
function leaveCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (currentRoomId) {
        socket.emit('leave-room', { roomId: currentRoomId });
        currentRoomId = null;
    }
    
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    
    document.getElementById('call-controls')?.classList.add('hidden');
    showToast('Left the call', 'info');
}

// Handle WebRTC Signaling
async function handleOffer(data) {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(configuration);
        
        peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) remoteVideo.srcObject = event.streams[0];
        };
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, roomId: currentRoomId });
            }
        };
        
        // Add local stream if exists
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
    }
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer: answer, roomId: currentRoomId });
}

async function handleAnswer(data) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
}

async function handleIceCandidate(data) {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}

function handleUserJoined() {
    showToast('A user joined the call', 'info');
}

function handleUserLeft() {
    showToast('A user left the call', 'info');
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) remoteVideo.srcObject = null;
}

// Toggle Audio/Video
function toggleAudio() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            showToast(audioTrack.enabled ? 'Microphone on' : 'Microphone off', 'info');
        }
    }
}

function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            showToast(videoTrack.enabled ? 'Camera on' : 'Camera off', 'info');
        }
    }
}