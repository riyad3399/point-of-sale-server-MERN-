// utils/deductStockFIFO.js
const PurchaseStock = require("../schemas/purchaseStockSchema");

async function deductStockFIFO(productId, quantity) {
  let qtyToDeduct = quantity;
  const deductionDetails = [];

  const stocks = await PurchaseStock.find({
    product: productId,
    remainingQuantity: { $gt: 0 },
  }).sort({ purchaseDate: 1, _id: 1 });

  for (const stock of stocks) {
    if (qtyToDeduct <= 0) break;

    const usedQty = Math.min(stock.remainingQuantity, qtyToDeduct);
    console.log(
      `Deducting ${usedQty} from batch ${stock._id} (remaining before: ${stock.remainingQuantity})`
    );

    stock.remainingQuantity -= usedQty;
    qtyToDeduct -= usedQty;

    await stock.save();

    deductionDetails.push({
      quantity: usedQty,
      purchasePrice: stock.purchasePrice,
      retailPrice: stock.retailPrice,
      wholesalePrice: stock.wholesalePrice,
    });
  }

  return {
    success: qtyToDeduct === 0,
    remainingToDeduct: qtyToDeduct,
    deductedBatches: deductionDetails,
  };
}

module.exports = deductStockFIFO;
