export const GET_FULL_INVENTORY = (itemCodes) => {
  if (!itemCodes?.length) throw new Error("Item codes required");

  const codes = itemCodes.map(code => `'${String(code).replace(/'/g, "''")}'`).join(', ');

  return `
    WITH TargetItems AS (SELECT ItemCode FROM (VALUES ${codes}) AS T(ItemCode)),
    SerialCounts AS (
      SELECT s.StoreID, t.ItemCode, COALESCE(SUM(serials.Quantity), 0) AS TotalSerialCount
      FROM TargetItems t
      CROSS JOIN (SELECT DISTINCT StoreID FROM dbo.Serials) s
      LEFT JOIN dbo.Serials serials ON s.StoreID = serials.StoreID AND t.ItemCode = serials.ItemCode
      GROUP BY s.StoreID, t.ItemCode
    )
    SELECT StoreID, ItemCode, TotalSerialCount
    FROM SerialCounts
    ORDER BY StoreID, ItemCode
  `;
};
