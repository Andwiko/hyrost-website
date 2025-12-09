// Membership controller placeholder
// Implement: subscribe, check status, upgrade, etc.

exports.subscribe = (req, res) => {
  // TODO: Subscribe logic
  res.send('Subscribe endpoint');
};

exports.status = (req, res) => {
  // TODO: Status logic
  res.send('Membership status endpoint');
};

// Kontroller untuk manajemen anggota
exports.getMemberProfile = async (req, res) => {
  try {
    const member = await User.findById(req.params.id)
      .select('-password')
      .populate('badges', 'name icon');
    
    if (!member) {
      return res.status(404).json({ message: 'Anggota tidak ditemukan' });
    }
    
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: 'Error server' });
  }
};