const Iframe = require('/models/Iframe');

// Membuat iframe baru
exports.createIframe = async (req, res) => {
    try {
        const iframe = new Iframe({
            ...req.body,
            createdBy: req.user.id
        });
        await iframe.save();
        res.status(201).json(iframe);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Mendapatkan semua iframe
exports.getAllIframes = async (req, res) => {
    try {
        // Filter berdasarkan role user
        const iframes = await Iframe.find({ 
            $or: [
                { allowedRoles: { $in: req.user.roles } },
                { allowedRoles: { $size: 0 } }
            ],
            isActive: true
        });
        res.json(iframes);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Mendapatkan iframe by ID
exports.getIframeById = async (req, res) => {
    try {
        const iframe = await Iframe.findOne({
            _id: req.params.id,
            $or: [
                { allowedRoles: { $in: req.user.roles } },
                { allowedRoles: { $size: 0 } }
            ],
            isActive: true
        });

        if (!iframe) {
            return res.status(404).json({ error: 'Iframe tidak ditemukan atau tidak diizinkan' });
        }

        res.json(iframe);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update iframe (hanya admin)
exports.updateIframe = async (req, res) => {
    try {
        const iframe = await Iframe.findOneAndUpdate(
            { _id: req.params.id },
            { 
                ...req.body,
                updatedAt: Date.now() 
            },
            { new: true }
        );

        if (!iframe) {
            return res.status(404).json({ error: 'Iframe tidak ditemukan' });
        }

        res.json(iframe);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Menonaktifkan iframe (hanya admin)
exports.toggleIframe = async (req, res) => {
    try {
        const iframe = await Iframe.findById(req.params.id);
        if (!iframe) {
            return res.status(404).json({ error: 'Iframe tidak ditemukan' });
        }

        iframe.isActive = !iframe.isActive;
        await iframe.save();
        res.json(iframe);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
