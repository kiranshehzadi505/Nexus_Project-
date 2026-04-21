const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../utils/supabase');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, bio } = req.body;
        
        // Check if user exists
        const { data: existing } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .single();
            
        if (existing) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        // Hash password (simplified - in production use Supabase Auth)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const { data: user, error } = await supabase
            .from('profiles')
            .insert([{
                name,
                email,
                role,
                bio: bio || '',
                balance: 0,
                created_at: new Date()
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Registration successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        const { data: user, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
            
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        if (user.role !== role) {
            return res.status(401).json({ success: false, message: `Invalid role. You are registered as ${user.role}` });
        }
        
        // For demo - accept any password
        // In production: await bcrypt.compare(password, user.password)
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

module.exports = router;