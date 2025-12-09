import React, { useState, useEffect } from 'react';
import { 
  fetchJobs, 
  createJob, 
  applyForJob,
  fetchMyApplications
} from '../api/jobs';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    requirements: '',
    reward: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsData, applicationsData] = await Promise.all([
          fetchJobs(),
          fetchMyApplications()
        ]);
        setJobs(jobsData);
        setApplications(applicationsData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCreateJob = async () => {
    try {
      const createdJob = await createJob(newJob);
      setJobs([...jobs, createdJob]);
      setNewJob({
        title: '',
        description: '',
        requirements: '',
        reward: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApplyForJob = async (jobId) => {
    try {
      await applyForJob(jobId);
      // Refresh applications
      const updatedApplications = await fetchMyApplications();
      setApplications(updatedApplications);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading jobs data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="jobs-container">
      <h2>Jobs Board</h2>
      
      <div className="create-job">
        <h3>Post New Job</h3>
        <input
          type="text"
          placeholder="Title"
          value={newJob.title}
          onChange={(e) => setNewJob({...newJob, title: e.target.value})}
        />
        <textarea
          placeholder="Description"
          value={newJob.description}
          onChange={(e) => setNewJob({...newJob, description: e.target.value})}
        />
        <textarea
          placeholder="Requirements"
          value={newJob.requirements}
          onChange={(e) => setNewJob({...newJob, requirements: e.target.value})}
        />
        <input
          type="text"
          placeholder="Reward"
          value={newJob.reward}
          onChange={(e) => setNewJob({...newJob, reward: e.target.value})}
        />
        <button onClick={handleCreateJob}>Post Job</button>
      </div>
      
      <div className="jobs-list">
        <h3>Available Jobs</h3>
        {jobs.length === 0 ? (
          <p>No jobs available</p>
        ) : (
          <ul>
            {jobs.map(job => (
              <li key={job._id}>
                <h3>{job.title}</h3>
                <p>{job.description}</p>
                <p><strong>Requirements:</strong> {job.requirements}</p>
                <p><strong>Reward:</strong> {job.reward}</p>
                <p>Posted by: {job.postedBy.username}</p>
                {!applications.some(app => app.job._id === job._id) ? (
                  <button onClick={() => handleApplyForJob(job._id)}>
                    Apply
                  </button>
                ) : (
                  <span>Applied</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="my-applications">
        <h3>My Applications</h3>
        {applications.length === 0 ? (
          <p>No applications submitted</p>
        ) : (
          <ul>
            {applications.map(application => (
              <li key={application._id}>
                <h3>{application.job.title}</h3>
                <p>Status: {application.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default JobsPage;