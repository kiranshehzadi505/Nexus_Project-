// Main Application Controller

// Show Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-in`;
    
    if (type === 'success') toast.classList.add('bg-green-500');
    else if (type === 'error') toast.classList.add('bg-red-500');
    else if (type === 'info') toast.classList.add('bg-blue-500');
    else toast.classList.add('bg-gray-700');
    
    toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    initVideoCall();
    initSignatureCanvas();
    initStripeMock();
    
    // Check for existing session
    const savedUser = getCurrentUser();
    if (savedUser) {
        currentUser = savedUser;
        await loadDashboard();
    }
    
    // Tab switching
    document.getElementById('login-tab')?.addEventListener('click', () => {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-tab').classList.add('border-indigo-600', 'text-indigo-600');
        document.getElementById('register-tab').classList.remove('border-indigo-600', 'text-indigo-600');
        document.getElementById('register-tab').classList.add('text-gray-500');
    });
    
    document.getElementById('register-tab')?.addEventListener('click', () => {
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-tab').classList.add('border-indigo-600', 'text-indigo-600');
        document.getElementById('login-tab').classList.remove('border-indigo-600', 'text-indigo-600');
        document.getElementById('login-tab').classList.add('text-gray-500');
    });
    
    // Login
    document.getElementById('do-login')?.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value;
        
        if (!email || !password) {
            showToast('Please fill all fields', 'error');
            return;
        }
        
        const result = await loginUser(email, password, role);
        if (result.success) {
            showToast(`Welcome back, ${result.user.name}!`, 'success');
            await loadDashboard();
        } else {
            showToast(result.error, 'error');
        }
    });
    
    // Register
    document.getElementById('do-register')?.addEventListener('click', async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;
        const bio = document.getElementById('reg-bio').value;
        
        if (!name || !email || !password) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        const result = await registerUser(name, email, password, role, bio);
        if (result.success) {
            showToast('Registration successful! Please login.', 'success');
            document.getElementById('login-tab').click();
        } else {
            showToast(result.error, 'error');
        }
    });
    
    // Logout
    document.getElementById('logout-link')?.addEventListener('click', async () => {
        await logoutUser();
        showToast('Logged out successfully', 'info');
        location.reload();
    });
    
    // Dashboard Tab Navigation
    document.querySelectorAll('.dashboard-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
            document.getElementById(`${tab}-panel`).classList.remove('hidden');
            document.querySelectorAll('.dashboard-tab').forEach(b => {
                b.classList.remove('text-indigo-600', 'border-indigo-600');
                b.classList.add('text-gray-500');
            });
            btn.classList.remove('text-gray-500');
            btn.classList.add('text-indigo-600', 'border-indigo-600');
            
            // Refresh data when switching tabs
            if (tab === 'meetings') loadMeetings();
            if (tab === 'documents') loadDocuments();
            if (tab === 'payments') loadTransactions();
        });
    });
});

// Load Dashboard
async function loadDashboard() {
    // Hide auth, show dashboard
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');
    document.getElementById('dashboard-link').classList.remove('hidden');
    document.getElementById('logout-link').classList.remove('hidden');
    
    // Load dashboard HTML
    const response = await fetch('dashboard.html');
    const html = await response.text();
    document.getElementById('dashboard-container').innerHTML = html;
    
    // Set user info
    document.getElementById('user-name-display').textContent = currentUser.name;
    document.getElementById('user-role-display').textContent = currentUser.role === 'investor' ? '💰 Investor' : '🚀 Entrepreneur';
    
    // Load all data
    await loadProfile();
    await loadUsersList();
    await loadMeetings();
    await loadDocuments();
    await loadTransactions();
    await updateBalanceDisplay();
    
    // Setup event listeners for dashboard features
    setupDashboardEvents();
}

// Load Profile
async function loadProfile() {
    const profile = await getUserProfile();
    if (profile) {
        document.getElementById('profile-name').textContent = profile.name;
        document.getElementById('profile-email').textContent = profile.email;
        document.getElementById('profile-role').textContent = profile.role;
        document.getElementById('profile-bio').textContent = profile.bio || 'Not provided';
        document.getElementById('profile-history').textContent = profile.investment_history || 'Not provided';
    }
}

// Load Users List for dropdowns
async function loadUsersList() {
    const users = await getAllUsers();
    const select = document.getElementById('meeting-participant');
    const transferSelect = document.getElementById('transfer-to');
    
    if (select) {
        select.innerHTML = '<option value="">Select Participant</option>' + 
            users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
    }
    
    if (transferSelect) {
        transferSelect.innerHTML = '<option value="">Select User</option>' + 
            users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
}

// Load Meetings
async function loadMeetings() {
    const meetings = await getUserMeetings();
    renderMeetings(meetings);
}

// Load Documents
async function loadDocuments() {
    const docs = await getUserDocuments();
    renderDocuments(docs);
}

// Setup Dashboard Events
function setupDashboardEvents() {
    // Edit Profile
    document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
        document.getElementById('profile-view').classList.add('hidden');
        document.getElementById('profile-edit').classList.remove('hidden');
        const profile = getUserProfile();
        profile.then(p => {
            document.getElementById('edit-name').value = p?.name || '';
            document.getElementById('edit-bio').value = p?.bio || '';
            document.getElementById('edit-history').value = p?.investment_history || '';
        });
    });
    
    document.getElementById('save-profile')?.addEventListener('click', async () => {
        const updates = {
            name: document.getElementById('edit-name').value,
            bio: document.getElementById('edit-bio').value,
            investment_history: document.getElementById('edit-history').value
        };
        const result = await updateProfile(updates);
        if (result.success) {
            showToast('Profile updated!', 'success');
            document.getElementById('profile-view').classList.remove('hidden');
            document.getElementById('profile-edit').classList.add('hidden');
            await loadProfile();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    });
    
    // Schedule Meeting
    document.getElementById('schedule-meeting-btn')?.addEventListener('click', async () => {
        const title = document.getElementById('meeting-title').value;
        const time = document.getElementById('meeting-time').value;
        const participantId = document.getElementById('meeting-participant').value;
        const agenda = document.getElementById('meeting-agenda').value;
        
        if (!title || !time || !participantId) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        
        const result = await scheduleMeeting(title, time, participantId, agenda);
        if (result.success) {
            showToast('Meeting scheduled!', 'success');
            document.getElementById('meeting-title').value = '';
            document.getElementById('meeting-time').value = '';
            document.getElementById('meeting-agenda').value = '';
            await loadMeetings();
        } else {
            showToast(result.error, 'error');
        }
    });
    
    // Video Call
    document.getElementById('create-room-btn')?.addEventListener('click', createRoom);
    document.getElementById('join-room-btn')?.addEventListener('click', () => joinRoom());
    document.getElementById('leave-call-btn')?.addEventListener('click', leaveCall);
    
    // Documents
    document.getElementById('upload-doc-btn')?.addEventListener('click', () => {
        const file = document.getElementById('doc-file').files[0];
        const title = document.getElementById('doc-title').value;
        if (!file) {
            showToast('Please select a file', 'error');
            return;
        }
        uploadDocument(file, title || file.name);
        document.getElementById('doc-title').value = '';
        document.getElementById('doc-file').value = '';
    });
    
    document.getElementById('clear-signature')?.addEventListener('click', clearSignature);
    document.getElementById('confirm-signature')?.addEventListener('click', confirmSignature);
    document.getElementById('close-sign-modal')?.addEventListener('click', () => {
        document.getElementById('sign-modal').classList.add('hidden');
    });
    
    // Payments
    document.getElementById('process-payment-btn')?.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const type = document.getElementById('payment-type').value;
        const recipientId = document.getElementById('transfer-to').value;
        
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }
        
        await processPayment(amount, type, type === 'transfer' ? recipientId : null);
        document.getElementById('payment-amount').value = '';
    });
    
    document.getElementById('payment-type')?.addEventListener('change', (e) => {
        const transferField = document.getElementById('transfer-user-field');
        if (transferField) {
            transferField.classList.toggle('hidden', e.target.value !== 'transfer');
        }
    });
}