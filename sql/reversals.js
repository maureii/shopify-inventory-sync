export const GET_REVERSALS = `
  WITH Today AS (SELECT CAST(GETDATE() AS DATE) AS TodayDate),
  Entries AS (
    SELECT e.POSTransNo, e.InvoiceNo, e.StoreID, e.ItemCode, e.GLDescription,
           TRY_CAST(e.CreatedDate AS DATETIME) AS Date
    FROM dbo.Entries e
    CROSS JOIN Today t
    WHERE TRY_CAST(e.ItemCode AS INT) > 1000
      AND e.GLDescription IN ('CASH SALES', 'INSTALLMENT SALES', 'REGULAR SALES')
      AND (e.InvoiceNo LIKE 'SI%-R' OR e.InvoiceNo LIKE 'CI%-R')
      AND e.Quantity < 0
      AND TRY_CAST(e.CreatedDate AS DATETIME) >= t.TodayDate
      AND TRY_CAST(e.CreatedDate AS DATETIME) < DATEADD(DAY, 1, t.TodayDate)
  )
  SELECT e.StoreID, e.ItemCode, COUNT(*) AS ReversalCount
  FROM Entries e
  LEFT JOIN dbo.POSDetails p ON e.POSTransNo = p.TransNo AND e.ItemCode = p.ItemCode
  WHERE TRY_CAST(e.ItemCode AS INT) > 1000
  GROUP BY e.StoreID, e.ItemCode
  ORDER BY e.StoreID, e.ItemCode
`;
