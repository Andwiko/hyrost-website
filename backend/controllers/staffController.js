// Kontroller untuk manajemen staff
exports.getStaffList = async (req, res) => {
  try {
    const staffMembers = await User.find({ role: { $in: ['admin', 'moderator'] } })
      .select('username avatar role joinDate');
    
    res.json(staffMembers);
  } catch (error) {
    res.status(500).json({ message: 'Error server' });
  }
};