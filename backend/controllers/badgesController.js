exports.awardBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    
    // Cek apakah user sudah memiliki badge ini
    const hasBadge = await User.findOne({ 
      _id: userId, 
      badges: badgeId 
    });
    
    if (hasBadge) {
      return res.status(400).json({ message: 'User sudah memiliki lencana ini' });
    }
    
    // Tambahkan badge ke user
    await User.findByIdAndUpdate(userId, {
      $push: { badges: badgeId }
    });
    
    res.json({ message: 'Lencana berhasil diberikan' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memberikan lencana' });
  }
};