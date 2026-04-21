// Document Management with E-Signature

let currentSignDocumentId = null;
let signatureCanvas = null;
let signatureContext = null;

// Initialize Signature Canvas
function initSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
        signatureCanvas = canvas;
        signatureContext = canvas.getContext('2d');
        signatureContext.strokeStyle = '#000';
        signatureContext.lineWidth = 2;
        
        let drawing = false;
        
        canvas.addEventListener('mousedown', (e) => {
            drawing = true;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            signatureContext.beginPath();
            signatureContext.moveTo(x, y);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (drawing) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                signatureContext.lineTo(x, y);
                signatureContext.stroke();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            drawing = false;
            signatureContext.beginPath();
        });
        
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            drawing = true;
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            signatureContext.beginPath();
            signatureContext.moveTo(x, y);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (drawing) {
                const rect = canvas.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                const y = e.touches[0].clientY - rect.top;
                signatureContext.lineTo(x, y);
                signatureContext.stroke();
            }
        });
        
        canvas.addEventListener('touchend', () => {
            drawing = false;
            signatureContext.beginPath();
        });
    }
}

// Upload Document
async function uploadDocument(file, title) {
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    try {
        // Convert file to base64 for storage (in production, use S3/Cloud Storage)
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                const base64Data = reader.result;
                
                const { data, error } = await supabase
                    .from('documents')
                    .insert([{
                        title: title,
                        file_name: file.name,
                        file_type: file.type,
                        file_data: base64Data,
                        uploaded_by: currentUser.id,
                        version: 1,
                        status: 'pending',
                        created_at: new Date()
                    }])
                    .select();
                    
                if (error) {
                    showToast('Error uploading: ' + error.message, 'error');
                    reject(error);
                } else {
                    showToast('Document uploaded successfully!', 'success');
                    loadDocuments();
                    resolve(data);
                }
            };
            
            reader.readAsDataURL(file);
        });
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed', 'error');
    }
}

// Get Documents
async function getUserDocuments() {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('uploaded_by', currentUser.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching documents:', error);
        return [];
    }
}

// Sign Document
async function signDocument(documentId, signatureData) {
    try {
        const { error } = await supabase
            .from('documents')
            .update({
                signature: signatureData,
                status: 'signed',
                signed_at: new Date()
            })
            .eq('id', documentId);
            
        if (error) throw error;
        
        showToast('Document signed successfully!', 'success');
        loadDocuments();
        return { success: true };
    } catch (error) {
        showToast('Error signing: ' + error.message, 'error');
        return { success: false };
    }
}

// Render Documents List
function renderDocuments(documents) {
    const container = document.getElementById('documents-list');
    if (!container) return;
    
    if (!documents || documents.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No documents uploaded</p>';
        return;
    }
    
    container.innerHTML = documents.map(doc => {
        const isSigned = doc.status === 'signed';
        const date = new Date(doc.created_at).toLocaleDateString();
        
        return `
            <div class="document-card border rounded-lg p-3 bg-white">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-file-${doc.file_type.includes('pdf') ? 'pdf' : 'image'} text-2xl text-indigo-500"></i>
                            <div>
                                <h4 class="font-semibold">${escapeHtml(doc.title)}</h4>
                                <p class="text-xs text-gray-500">${doc.file_name} • Uploaded: ${date}</p>
                            </div>
                        </div>
                        <div class="mt-2 flex space-x-2">
                            <button onclick="window.viewDocument('${doc.id}')" class="text-blue-600 text-sm hover:underline">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${!isSigned ? `
                                <button onclick="window.showSignModal('${doc.id}')" class="text-green-600 text-sm hover:underline">
                                    <i class="fas fa-signature"></i> E-Sign
                                </button>
                            ` : `
                                <span class="text-green-600 text-sm">
                                    <i class="fas fa-check-circle"></i> Signed
                                </span>
                            `}
                        </div>
                    </div>
                    <span class="text-xs px-2 py-1 rounded ${isSigned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${doc.status}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// View Document
window.viewDocument = async (documentId) => {
    const { data, error } = await supabase
        .from('documents')
        .select('file_data, file_type')
        .eq('id', documentId)
        .single();
        
    if (data && data.file_data) {
        const win = window.open();
        win.document.write(`<iframe src="${data.file_data}" width="100%" height="100%"></iframe>`);
    }
};

// Show Signature Modal
window.showSignModal = (documentId) => {
    currentSignDocumentId = documentId;
    const modal = document.getElementById('sign-modal');
    if (modal) {
        // Clear canvas
        signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        signatureContext.fillStyle = '#fff';
        signatureContext.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        signatureContext.fillStyle = '#000';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// Clear Signature
function clearSignature() {
    if (signatureContext) {
        signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        signatureContext.fillStyle = '#fff';
        signatureContext.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        signatureContext.fillStyle = '#000';
    }
}

// Confirm Signature
async function confirmSignature() {
    if (!currentSignDocumentId) return;
    
    const signatureData = signatureCanvas.toDataURL();
    await signDocument(currentSignDocumentId, signatureData);
    
    const modal = document.getElementById('sign-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentSignDocumentId = null;
}