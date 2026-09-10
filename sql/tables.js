export const POS_DETAILS = `
  SELECT DetailID, TransNo, LineNumber, LineType, LoanID, ItemCode, Description, BrandID, DeptID, ClassID, Quantity, Unit, Pricelist,
         Currency, OrigPrice, UnitPrice, Discount, NetPrice, UnitCost, TotalCost, TaxCode, VATType, TaxRate, TaxBase,
         TaxAmount, Principal, Interest, Amount, DueDate, Serial, OurRef, LedgerType, GLLink, TerminalID, IsVoid,
         Particulars, Authorizer, ReasonID, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate, LCP
  FROM dbo.POSDetails
`;

export const POS_HEADER = `
  SELECT TransNo, ReportingDate, InvoiceNo, CustomerID, FullName, Address, TIN, SCPWD, SCPWDDiscount, TransType, SaleType, LoanID, TermID, DueDate, PONo, Currency, LCP,
         Downpayment, AmountFinanced, TotalPrice, StoreID, SalesmanID, CollectorID, PaidTo, VatableSale, VAT, VATExempt, ZeroRated, SCPWDAmount, TotalSale, CashPymt,
         CreditCardPymt, GiftCardPymt, CheckPymt, TotalPayment, Remarks, IsVoid, VoidBy, VoidReasonID, IsProcessed, TerminalID, PrevTransNo, OrigTransNo,
         CreatedBy, CreatedDate, ModifiedBy, ModifiedDate, MMSTransNo, MMSRollOverNo
  FROM dbo.POSHeader
`;

export const POS_PAYMENTS = `
  SELECT PaymentID, TransNo, LineNumber, OurRef, ReportingDate, CustomerID, LoanID, Tender, GLlink, Currency, Amount, Particulars, Bank,
         Branch, DocNo, DocDate, TerminalID, IsVoid, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
  FROM dbo.POSPayments
`;

export const ENTRIES = `
  SELECT EntryNo, RecordType, POSTransNo, LoanID, InvoiceNo, ReceiptNo, CustomerID, FullName, EntryDate, ReportingDate, FY, Period,
         TransType, SaleType, LineType, StoreID, PaidTo, LineNumber, Salesman, CollectionZone, Collector, LedgerType, Quantity,
         ItemCode, ItemDescription, Currency, UnitPrice, Discount, NetPrice, TermID, DueDate, Principal, Interest, Amount,
         Tender, DocNo, DocDate, GLCode, GLDescription, IsProcessed, IsVoid, IsDeposited, DepositDate, OurRef,
         Particulars, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
  FROM dbo.Entries
`;

export const SERIALS = `
  SELECT ID, StoreID, ItemCode, ModelCode, SerialNo, Quantity, TransNo, Reference, EntryDate, CreatedBy, CreatedDate
  FROM dbo.Serials
`;
