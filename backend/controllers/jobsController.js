const Job = require('../models/Job');

// Create new job posting
exports.createJob = async (req, res) => {
    try {
        const job = new Job({
            ...req.body,
            userId: req.user.id
        });
        await job.save();
        res.status(201).json(job);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all jobs
exports.listJobs = async (req, res) => {
    try {
        const jobs = await Job.find().populate('userId', 'username');
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Apply for a job
exports.applyForJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        
        const existingApplication = job.applicants.find(
            app => app.userId.toString() === req.user.id
        );
        
        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied for this job' });
        }
        
        job.applicants.push({
            userId: req.user.id,
            message: req.body.message
        });
        
        await job.save();
        res.json(job);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
