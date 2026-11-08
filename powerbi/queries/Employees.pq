let
    GetPage = (page as number) => Json.Document(Web.Contents("http://127.0.0.1:8765", [RelativePath="api/trinet/v1/employees", Query=[page=Text.From(page),pageSize="1000"]])),
    Pages = List.Generate(()=>[p=1,r=GetPage(1)], each List.Count([r][data]) > 0, each if [r][pagination][hasMore] then [p=[p]+1,r=GetPage([p]+1)] else [p=[p]+1,r=[data={}]], each [r][data]),
    Rows = List.Combine(Pages),
    Table = Table.FromRecords(Rows, {"employeeId","name","department","role","hourlyRate","shopId"}, MissingField.UseNull),
    Typed = Table.TransformColumnTypes(Table, {{"employeeId", type text},{"name", type text},{"department", type text},{"role", type text},{"hourlyRate", type number},{"shopId", type text}})
in
    Typed