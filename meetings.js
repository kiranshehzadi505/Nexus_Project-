// Meeting Management

// Schedule Meeting
async function scheduleMeeting(title, meetingTime, participantId, agenda) {
    try {
        // Check for conflicts
        const { data: conflicts, error: checkError } = await supabase
            .from('meetings')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('meeting_time', meetingTime);
            
        if (checkError) throw checkError;
        
        if (conflicts && conflicts.length > 0) {
            return { success: false, error: 'Time slot conflict! You already have a meeting at this time.' };
        }
        
        const { data, error } = await supabase
            .from('meetings')
            .insert([{
                title: title,
                meeting_time: meetingTime,
                organizer_id: currentUser.id,
                participant_id: participantId,
                agenda: agenda,
                status: 'pending',
                created_at: new Date()
            }])
            .select();
            
        if (error) throw error;
        
        return { success: true, meeting: data[0] };
    } catch (error) {
        console.error('Schedule meeting error:', error);
        return { success: false, error: error.message };
    }
}

// Get User's Meetings
async function getUserMeetings() {
    try {
        const { data, error } = await supabase
            .from('meetings')
            .select(`
                *,
                organizer:organizer_id(name, email),
                participant:participant_id(name, email)
            `)
            .or(`organizer_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`)
            .order('meeting_time', { ascending: true });
            
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching meetings:', error);
        return [];
    }
}

// Update Meeting Status
async function updateMeetingStatus(meetingId, status) {
    try {
        const { error } = await supabase
            .from('meetings')
            .update({ status: status })
            .eq('id', meetingId);
            
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Render Meetings List
function renderMeetings(meetings) {
    const container = document.getElementById('meetings-list');
    if (!container) return;
    
    if (!meetings || meetings.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No meetings scheduled</p>';
        return;
    }
    
    container.innerHTML = meetings.map(meeting => {
        const isOrganizer = meeting.organizer_id === currentUser.id;
        const otherPerson = isOrganizer ? meeting.participant : meeting.organizer;
        const meetingDate = new Date(meeting.meeting_time);
        
        let statusColor = 'bg-yellow-100 text-yellow-800';
        if (meeting.status === 'accepted') statusColor = 'bg-green-100 text-green-800';
        if (meeting.status === 'rejected') statusColor = 'bg-red-100 text-red-800';
        
        return `
            <div class="border rounded-lg p-3 hover:shadow-md transition">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold">${escapeHtml(meeting.title)}</h4>
                        <p class="text-sm text-gray-600">With: ${escapeHtml(otherPerson?.name || 'Unknown')}</p>
                        <p class="text-xs text-gray-500">${meetingDate.toLocaleString()}</p>
                        ${meeting.agenda ? `<p class="text-xs text-gray-600 mt-1">📋 ${escapeHtml(meeting.agenda)}</p>` : ''}
                    </div>
                    <span class="text-xs px-2 py-1 rounded ${statusColor}">${meeting.status}</span>
                </div>
                ${!isOrganizer && meeting.status === 'pending' ? `
                    <div class="flex space-x-2 mt-2">
                        <button onclick="window.acceptMeeting('${meeting.id}')" class="bg-green-500 text-white px-3 py-1 rounded text-sm">Accept</button>
                        <button onclick="window.rejectMeeting('${meeting.id}')" class="bg-red-500 text-white px-3 py-1 rounded text-sm">Reject</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Helper Functions
window.acceptMeeting = async (meetingId) => {
    const result = await updateMeetingStatus(meetingId, 'accepted');
    if (result.success) {
        showToast('Meeting accepted!', 'success');
        loadMeetings();
    } else {
        showToast('Error: ' + result.error, 'error');
    }
};

window.rejectMeeting = async (meetingId) => {
    const result = await updateMeetingStatus(meetingId, 'rejected');
    if (result.success) {
        showToast('Meeting rejected', 'info');
        loadMeetings();
    } else {
        showToast('Error: ' + result.error, 'error');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}