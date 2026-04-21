const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "https://nexus-*.vercel.app"],
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// User routes
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, role');
        
        if (error) throw error;
        res.json({ success: true, users: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Meeting routes
app.post('/api/meetings', async (req, res) => {
    try {
        const { title, meeting_time, organizer_id, participant_id, agenda } = req.body;
        
        // Check for conflicts
        const { data: conflicts } = await supabase
            .from('meetings')
            .select('*')
            .eq('organizer_id', organizer_id)
            .eq('meeting_time', meeting_time);
        
        if (conflicts && conflicts.length > 0) {
            return res.status(409).json({ success: false, error: 'Time slot conflict' });
        }
        
        const { data, error } = await supabase
            .from('meetings')
            .insert([{ title, meeting_time, organizer_id, participant_id, agenda, status: 'pending' }])
            .select();
        
        if (error) throw error;
        res.json({ success: true, meeting: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/meetings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('meetings')
            .select('*, organizer:organizer_id(name, email), participant:participant_id(name, email)')
            .or(`organizer_id.eq.${userId},participant_id.eq.${userId}`)
            .order('meeting_time', { ascending: true });
        
        if (error) throw error;
        res.json({ success: true, meetings: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket for Video Calls
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-room', ({ roomId, userId }) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', { userId });
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(socket.id);
    });
    
    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', { offer });
    });
    
    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', { answer });
    });
    
    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', { candidate });
    });
    
    socket.on('leave-room', ({ roomId }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user-left');
        if (rooms.has(roomId)) {
            rooms.get(roomId).delete(socket.id);
            if (rooms.get(roomId).size === 0) {
                rooms.delete(roomId);
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove from all rooms
        for (const [roomId, sockets] of rooms.entries()) {
            if (sockets.has(socket.id)) {
                sockets.delete(socket.id);
                socket.to(roomId).emit('user-left');
                if (sockets.size === 0) {
                    rooms.delete(roomId);
                }
                break;
            }
        }
    });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});