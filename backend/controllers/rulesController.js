exports.getRules = async (req, res) => {
  try {
    const rules = await Rules.find().sort({ order: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil aturan' });
  }
};