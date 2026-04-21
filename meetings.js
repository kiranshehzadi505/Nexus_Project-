const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const router = express.Router();

// Get user's meetings
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data: meetings, error } = await supabase
            .from('meetings')
            .select(`
                *,
                organizer:organizer_id(id, name, email),
                participant:participant_id(id, name, email)
            `)
            .or(`organizer_id.eq.${req.user.id},participant_id.eq.${req.user.id}`)
            .order('meeting_time', { ascending: true });
            
        if (error) throw error;
        
        res.json({ success: true, meetings: meetings || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching meetings' });
    }
});

// Create meeting
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, meetingTime, participantId, agenda } = req.body;
        
        // Check for conflicts
        const { data: conflicts } = await supabase
            .from('meetings')
            .select('*')
            .eq('organizer_id', req.user.id)
            .eq('meeting_time', meetingTime);
            
        if (conflicts && conflicts.length > 0) {
            return res.status(409).json({ success: false, message: 'Time slot conflict' });
        }
        
        const { data: meeting, error } = await supabase
            .from('meetings')
            .insert([{
                title,
                meeting_time: meetingTime,
                organizer_id: req.user.id,
                participant_id: participantId,
                agenda: agenda || '',
                status: 'pending',
                created_at: new Date()
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({ success: true, message: 'Meeting scheduled', meeting });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error scheduling meeting' });
    }
});

// Update meeting status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const { error } = await supabase
            .from('meetings')
            .update({ status })
            .eq('id', id)
            .eq('participant_id', req.user.id);
            
        if (error) throw error;
        
        res.json({ success: true, message: `Meeting ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating meeting' });
    }
});

module.exports = router;