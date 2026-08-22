// Legacy endpoint — marketplace now uses MySQL via marketplaceController
exports.createProduct = async (req, res) => {
  return res.status(410).json({
    message: 'Endpoint /api/products sudah tidak digunakan. Gunakan POST /api/marketplace/listings dengan Authorization Bearer token.',
  });
};
