let
    GetPage = (page as number) => Json.Document(Web.Contents("http://127.0.0.1:8765", [RelativePath="api/powerbi/dates", Query=[page=Text.From(page),pageSize="1000"]])),
    Pages = List.Generate(()=>[p=1,r=GetPage(1)], each List.Count([r][data]) > 0, each if [r][pagination][hasMore] then [p=[p]+1,r=GetPage([p]+1)] else [p=[p]+1,r=[data={}]], each [r][data]),
    Rows = List.Combine(Pages),
    Table = Table.FromRecords(Rows, {"date","weekStart","month","day","currentWeek","currentMonth","today"}, MissingField.UseNull),
    Typed = Table.TransformColumnTypes(Table, {{"date", type text},{"weekStart", type text},{"month", type text},{"day", type text},{"currentWeek", Int64.Type},{"currentMonth", Int64.Type},{"today", Int64.Type}})
in
    Typed