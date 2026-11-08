let
    GetPage = (page as number) => Json.Document(Web.Contents("http://127.0.0.1:8765", [RelativePath="api/tekmetric/v1/repair-orders", Query=[page=Text.From(page),pageSize="1000"]])),
    Pages = List.Generate(()=>[p=1,r=GetPage(1)], each List.Count([r][data]) > 0, each if [r][pagination][hasMore] then [p=[p]+1,r=GetPage([p]+1)] else [p=[p]+1,r=[data={}]], each [r][data]),
    Rows = List.Combine(Pages),
    Table = Table.FromRecords(Rows, {"repairOrderId","shopId","date","weekStart","month","technicianId","service","status","laborHours","laborSales","partsSales","partsCost","total","grossProfit"}, MissingField.UseNull),
    Typed = Table.TransformColumnTypes(Table, {{"repairOrderId", type text},{"shopId", type text},{"date", type text},{"weekStart", type text},{"month", type text},{"technicianId", type text},{"service", type text},{"status", type text},{"laborHours", type number},{"laborSales", type number},{"partsSales", type number},{"partsCost", type number},{"total", type number},{"grossProfit", type number}})
in
    Typed