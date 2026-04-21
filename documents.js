const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Get user's documents
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data: documents, error } = await supabase
            .from('documents')
            .select('id, title, file_name, file_type, status, version, created_at, signed_at')
            .eq('uploaded_by', req.user.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ success: true, documents: documents || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching documents' });
    }
});

// Upload document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { title } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        const base64Data = file.buffer.toString('base64');
        const fileDataUrl = `data:${file.mimetype};base64,${base64Data}`;
        
        const { data: document, error } = await supabase
            .from('documents')
            .insert([{
                title: title || file.originalname,
                file_name: file.originalname,
                file_type: file.mimetype,
                file_data: fileDataUrl,
                uploaded_by: req.user.id,
                version: 1,
                status: 'pending',
                created_at: new Date()
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({ success: true, message: 'Document uploaded', document: { id: document.id, title: document.title } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error uploading document' });
    }
});

// Sign document
router.post('/:id/sign', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { signature } = req.body;
        
        const { error } = await supabase
            .from('documents')
            .update({ signature, status: 'signed', signed_at: new Date() })
            .eq('id', id)
            .eq('uploaded_by', req.user.id);
            
        if (error) throw error;
        
        res.json({ success: true, message: 'Document signed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error signing document' });
    }
});

// Get document file
router.get('/:id/file', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: document, error } = await supabase
            .from('documents')
            .select('file_data, file_type')
            .eq('id', id)
            .eq('uploaded_by', req.user.id)
            .single();
            
        if (error || !document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        
        res.json({ success: true, fileData: document.file_data, fileType: document.file_type });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching file' });
    }
});

module.exports = router;