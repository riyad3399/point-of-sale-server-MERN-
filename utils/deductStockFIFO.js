// utils/deductStockFIFO.js
const PurchaseStock = require("../schemas/purchaseStockSchema");

async function deductStockFIFO(productId, quantity) {
  let qtyToDeduct = quantity;

  const stocks = await PurchaseStock.find({
    product: productId,
    remainingQuantity: { $gt: 0 },
  }).sort({ purchaseDate: 1 }); // Oldest first

  for (const stock of stocks) {
    if (qtyToDeduct <= 0) break;

    const usedQty = Math.min(stock.remainingQuantity, qtyToDeduct);
    stock.remainingQuantity -= usedQty;
    qtyToDeduct -= usedQty;
    await stock.save();
  }
}

module.exports = deductStockFIFO;
