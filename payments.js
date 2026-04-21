// Payment System (Mock Stripe Integration)

// Process Payment
async function processPayment(amount, type, recipientId = null) {
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    try {
        // Get current user's balance
        const profile = await getUserProfile();
        let currentBalance = profile?.balance || 0;
        let newBalance = currentBalance;
        let transactionStatus = 'completed';
        
        if (type === 'deposit') {
            newBalance = currentBalance + amount;
            transactionStatus = 'completed';
        } else if (type === 'transfer') {
            if (!recipientId) {
                showToast('Please select a recipient', 'error');
                return;
            }
            if (currentBalance < amount) {
                showToast('Insufficient funds', 'error');
                return;
            }
            newBalance = currentBalance - amount;
            
            // Update recipient balance
            const recipientProfile = await getUserProfile(recipientId);
            const newRecipientBalance = (recipientProfile?.balance || 0) + amount;
            await supabase.from('profiles').update({ balance: newRecipientBalance }).eq('id', recipientId);
        }
        
        // Update user balance
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', currentUser.id);
            
        if (updateError) throw updateError;
        
        // Record transaction
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert([{
                user_id: currentUser.id,
                amount: amount,
                type: type,
                recipient_id: recipientId,
                status: transactionStatus,
                created_at: new Date()
            }]);
            
        if (transactionError) throw transactionError;
        
        showToast(`$${amount} ${type === 'deposit' ? 'deposited' : 'transferred'} successfully!`, 'success');
        loadTransactions();
        updateBalanceDisplay();
        
        return { success: true };
    } catch (error) {
        console.error('Payment error:', error);
        showToast('Payment failed: ' + error.message, 'error');
        return { success: false };
    }
}

// Get User Transactions
async function getUserTransactions() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

// Update Balance Display
async function updateBalanceDisplay() {
    const profile = await getUserProfile();
    const balanceSpan = document.getElementById('user-balance');
    if (balanceSpan && profile) {
        balanceSpan.textContent = `$${profile.balance || 0}`;
    }
}

// Load and Render Transactions
async function loadTransactions() {
    const transactions = await getUserTransactions();
    renderTransactions(transactions);
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = transactions.map(tx => {
        const date = new Date(tx.created_at).toLocaleString();
        const isDeposit = tx.type === 'deposit';
        
        return `
            <div class="flex justify-between items-center border-b pb-2">
                <div>
                    <p class="font-medium">${tx.type.toUpperCase()}</p>
                    <p class="text-xs text-gray-500">${date}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold ${isDeposit ? 'text-green-600' : 'text-red-600'}">
                        ${isDeposit ? '+' : '-'}$${tx.amount}
                    </p>
                    <p class="text-xs ${tx.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}">${tx.status}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize Stripe Elements (Mock)
function initStripeMock() {
    console.log('Mock Stripe payment system initialized');
    // In production, replace with actual Stripe.js integration
}