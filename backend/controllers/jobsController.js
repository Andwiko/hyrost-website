const pool = require('../config/mysql');

// Create new job posting
exports.createJob = async (req, res) => {
    try {
        const { title, description, requirements, reward } = req.body;
        const userId = req.user.id;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO jobs (user_id, title, description, requirements, reward) VALUES (?, ?, ?, ?, ?)',
            [userId, title, description, requirements || '', reward || '']
        );

        res.status(201).json({
            id: result.insertId,
            userId,
            title,
            description,
            requirements,
            reward,
            status: 'open'
        });
    } catch (error) {
        console.error('CREATE JOB ERROR:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all jobs
exports.listJobs = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT j.*, u.username, u.avatar_url 
             FROM jobs j 
             JOIN users u ON j.user_id = u.id 
             ORDER BY j.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('LIST JOBS ERROR:', error);
        res.status(500).json({ error: error.message });
    }
};

// Apply for a job
exports.applyForJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const applicantId = req.user.id;
        const { message } = req.body;

        const [jobs] = await pool.execute('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (jobs.length === 0) return res.status(404).json({ error: 'Job not found' });

        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [applicantId, 'APPLY_JOB', `Applied for job #${jobId}: ${message || 'No message'}`]
        );

        res.json({ message: 'Application submitted successfully', jobId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
