const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const router = express.Router();

// Get transactions
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ success: true, transactions: transactions || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching transactions' });
    }
});

// Get balance
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', req.user.id)
            .single();
            
        if (error) throw error;
        res.json({ success: true, balance: user.balance || 0 });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching balance' });
    }
});

// Process payment
router.post('/process', authenticateToken, async (req, res) => {
    try {
        const { amount, type, recipientId } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        
        // Get current balance
        const { data: user } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', req.user.id)
            .single();
            
        let currentBalance = user?.balance || 0;
        
        if (type === 'deposit') {
            const newBalance = currentBalance + amount;
            
            await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', req.user.id);
                
            await supabase
                .from('transactions')
                .insert([{
                    user_id: req.user.id,
                    amount,
                    type: 'deposit',
                    status: 'completed',
                    created_at: new Date()
                }]);
                
            res.json({ success: true, message: `$${amount} deposited`, newBalance });
            
        } else if (type === 'transfer') {
            if (!recipientId) {
                return res.status(400).json({ success: false, message: 'Recipient required' });
            }
            
            if (currentBalance < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient funds' });
            }
            
            // Get recipient
            const { data: recipient } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', recipientId)
                .single();
                
            if (!recipient) {
                return res.status(404).json({ success: false, message: 'Recipient not found' });
            }
            
            // Update balances
            await supabase
                .from('profiles')
                .update({ balance: currentBalance - amount })
                .eq('id', req.user.id);
                
            await supabase
                .from('profiles')
                .update({ balance: (recipient.balance || 0) + amount })
                .eq('id', recipientId);
                
            await supabase
                .from('transactions')
                .insert([{
                    user_id: req.user.id,
                    amount,
                    type: 'transfer',
                    recipient_id: recipientId,
                    status: 'completed',
                    created_at: new Date()
                }]);
                
            res.json({ success: true, message: `$${amount} transferred`, newBalance: currentBalance - amount });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error processing payment' });
    }
});

module.exports = router;