// Supabase Configuration
const SUPABASE_URL = 'https://your-project.supabase.co'; // REPLACE WITH YOUR URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // REPLACE WITH YOUR KEY

let supabase;
let currentUser = null;

// Initialize Supabase
function initSupabase() {
    if (typeof supabaseJs !== 'undefined') {
        supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase not loaded');
    }
}

// Register User
async function registerUser(name, email, password, role, bio) {
    try {
        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { name: name, role: role, bio: bio }
            }
        });
        
        if (authError) throw authError;
        
        // Store additional profile data
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
                id: authData.user.id,
                name: name,
                email: email,
                role: role,
                bio: bio,
                balance: 0,
                created_at: new Date()
            }]);
            
        if (profileError) throw profileError;
        
        return { success: true, user: authData.user };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    }
}

// Login User
async function loginUser(email, password, role) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Verify role matches
        const userRole = data.user.user_metadata?.role;
        if (userRole !== role) {
            throw new Error(`Invalid role. You are registered as ${userRole}`);
        }
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name,
            role: userRole
        };
        
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        
        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout
async function logoutUser() {
    await supabase.auth.signOut();
    localStorage.removeItem('nexus_user');
    currentUser = null;
    return { success: true };
}

// Get Current User
function getCurrentUser() {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('nexus_user');
    if (stored) {
        currentUser = JSON.parse(stored);
        return currentUser;
    }
    return null;
}

// Update Profile
async function updateProfile(updates) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id);
            
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get User Profile
async function getUserProfile(userId = null) {
    const id = userId || currentUser?.id;
    if (!id) return null;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

// Get All Users (for meetings/payments)
async function getAllUsers() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .neq('id', currentUser.id);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}