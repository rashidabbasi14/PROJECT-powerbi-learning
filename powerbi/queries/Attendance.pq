let
    GetPage = (page as number) => Json.Document(Web.Contents("http://127.0.0.1:8765", [RelativePath="api/trinet/v1/attendance", Query=[page=Text.From(page),pageSize="1000"]])),
    Pages = List.Generate(()=>[p=1,r=GetPage(1)], each List.Count([r][data]) > 0, each if [r][pagination][hasMore] then [p=[p]+1,r=GetPage([p]+1)] else [p=[p]+1,r=[data={}]], each [r][data]),
    Rows = List.Combine(Pages),
    Table = Table.FromRecords(Rows, {"attendanceId","employeeId","employeeName","department","date","weekStart","month","status","scheduledHours","workedHours","leaveHours","lateMinutes","overtimeHours","laborCost"}, MissingField.UseNull),
    Typed = Table.TransformColumnTypes(Table, {{"attendanceId", type text},{"employeeId", type text},{"employeeName", type text},{"department", type text},{"date", type text},{"weekStart", type text},{"month", type text},{"status", type text},{"scheduledHours", Int64.Type},{"workedHours", type number},{"leaveHours", Int64.Type},{"lateMinutes", Int64.Type},{"overtimeHours", type number},{"laborCost", type number}})
in
    Typed