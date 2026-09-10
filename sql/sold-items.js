export const GET_SOLD_ITEMS = `
  WITH Today AS (
    SELECT CAST(GETDATE() AS DATE) AS TodayDate
  ),
  Entries AS (
    SELECT
      e.StoreID,
      e.ItemCode,
      e.Quantity
    FROM dbo.Entries e
    CROSS JOIN Today t
    WHERE TRY_CAST(e.ItemCode AS INT) > 1000
      AND e.EntryDate >= t.TodayDate
      AND e.EntryDate < DATEADD(DAY, 1, t.TodayDate)
      AND e.IsVoid = 0
  )
  SELECT
    StoreID,
    ItemCode,
    SUM(Quantity) AS SoldCount
  FROM Entries
  GROUP BY
    StoreID,
    ItemCode
  ORDER BY
    StoreID,
    ItemCode
`;
