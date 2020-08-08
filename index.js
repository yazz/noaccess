exports.load = function(fileName) {

console.log("Load Access file: " + fileName);

//2,4, 5, 18, 42
let defnPage            = 2//2//75//81
let headerJetVersion    = 4
var fs                  = require("fs");
let showDebug           = false
let dbFileName          = fileName
var offset              = 0
var tempoffset
var stats               = fs.statSync(dbFileName)
var fileSizeInBytes     = stats["size"]
let numPages            = (fileSizeInBytes / 4096) + 1

let wholeDb             = {}

if (showDebug) {
    console.log("fileSizeInBytes: " + fileSizeInBytes )
    console.log("")
    console.log("")
}

var binary              = fs.readFileSync(dbFileName);



//
// do stuff with the functions
//

findDataPages()
getTableDefinitionForPage(defnPage)
populateDataForTableDefinedOnPage(defnPage)



return  wholeDb




// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function byteArrayToLong(/*byte[]*/byteArray) {
    var value = 0;
    for ( var i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
    }

    return value;
};








// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function find(aoffset, length , typeob) {
    let value = binary.slice(aoffset, aoffset + length)
    if (typeob=="number") {
        return byteArrayToLong(value)
    } else if (typeob == "littleendian")  {
        value = [value[2],value[1],value[0]]
        return byteArrayToLong(value)
    }
    return value
}









// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function getVar(params) {
    if (params.useJetVersion) {
        if (headerJetVersion != params.useJetVersion) {
            console.log("Skipping " + params.name)
            return null
        }
    }
    let retvalue = find(tempoffset , params.length, params.type)

    tempoffset = tempoffset + params.length
    if (params.type == "string") {
        retvalue = retvalue.toString()
    }
    return retvalue
}






// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------

function getColumnType(colType) {
    switch(colType) {
        case 1:
            return "Boolean"
        case 2:
            return "Integer, 8 bit"
        case 3:
            return "Integer, 16 bit"
        case 4:
            return "Integer, 32 bit"
        case 5:
            return "Fixed Point Number, 64 bit (Money / Currency)"
        case 6:
            return "Floating Point Number, 32 bit (single)"
        case 7:
            return "Floating Point Number, 64 bit (double)"
        case 8:
            return "Date/Time, 64 bit, (stored as double)"
        case 9:
            return "Binary (up to 255 bytes)"
        case 10:
            return "Text (up to 255 characters)"
        case 11:
            return "OLE (long binary)"
        case 12:
            return "Memo (long Text)"
        case 15:
            return "GUID (global unique identifier)"
        case 16:
            return "Fixed Point, 96 bit, stored in 17 bytes"
        case 18:
            return "Complex field (32 bit integer key)"
            break;
      default:
        return "Unknown"
        // code block
    }
}






// ---------------------------------------------------------------------------+
//
//                          +---------------+
//                          | findDataPages |
//                          +---------------+
//
//
// Every MS Access database has a set of tables, each of which contain data.
//
// In an MS Access file this data is stored across many pages, in pages known
// as data pages. What this "findDataPages" method does is to go
// through all the pages in the MS Access file and find out which
// pages belong to which tables. We can tell this as there is a pointer from
// each data page to the table definition page, as shown below (****)
//
//
// +--------------------------------------------------------------------------+
// | Jet4 Data Page Definition                                                |
// +------+---------+---------------------------------------------------------+
// | data | length  | name       | description                                |
// +------+---------+---------------------------------------------------------+
// | 0x01 | 1 byte  | page_type  | 0x01 indicates a data page.                |
// |      | 1 byte  | unknown    |                                            |
// |      | 2 bytes | free_space | Free space in this page                    |
// |      | 4 bytes | tdef_pg    | Page pointer to table definition (****)    |
// |      | 4 bytes | unknown    |                                            |
// |      | 2 bytes | num_rows   | number of records on this page             |
// +--------------------------------------------------------------------------+
//
// Once we have the pages read in then we store them like so in the global
// "wholeDb" variable:
//
// wholeDb
// {
//     table_pages
//     {
//         2
//         {
//            pages
//            [
//              {
//                pagenum: 17,
//                recordcount: 43
//              },
//              {
//                pagenum: 122
//                recordcount: 7
//              }
//            ],
//
// -----------------------------------------------------------------------
function findDataPages() {

    let listOfTableDefPages = {}

    //
    // for every page in the MS access database file
    //
    for (    let currentPage = 0;    currentPage < numPages;    currentPage++    ){

        tempoffset = 4096 * currentPage

        //
        // if this page is a data page ...
        //
        let page_type = getVar({length: 1,name: "Page Type",type: "number"})
        if (page_type == 0x01) {
            getVar({length: 1,name: "Unknown"})
            getVar({length: 2,name: "Free Space",type: "number"})

            //
            // get the page number of the table definition
            //
            let tdef_pg =    getVar({length: 4,name: "tdef_pg",type: "number"})
            getVar({length: 4,name: "Unknown"})
            let RecordCount = getVar({length: 2,name: "RecordCount",type: "number"})

            if (tdef_pg < 2) {

            } else if (tdef_pg > 10000) {

            } else if (!listOfTableDefPages[tdef_pg]) {
                listOfTableDefPages[tdef_pg] = {
                    data_pages: [{pagenum: currentPage, recordcount: RecordCount}]
                }

            } else {
               listOfTableDefPages[tdef_pg].data_pages.push({pagenum: currentPage, recordcount: RecordCount})
            }
        }
    }

    wholeDb.table_pages = listOfTableDefPages
}









// -----------------------------------------------------------------------
//
//                       +----------------------------+
//                       |  getTableDefinitionForPage |
//                       +----------------------------+
//
// This reads the table definition and stores it in "wholeDb". The
// originating MS Access structure for table definition page is:
//
//
// +-------------------------------------------------------------------------+
// | Jet4 Table Definition Header
// +------+---------+-------------+------------------------------------------+
// | data | length  | name        | description                              |
// +------+---------+-------------+------------------------------------------+
// | 0x02 | 1 bytes | page_type   | 0x02 indicate a table defn page            |
// |      | 1 bytes | unknown     |                                          |
// |      | 2 bytes | tdef_id     | (jet4) Free space on this page minus 8   |
// | 0x00 | 4 bytes | next_pg     | Next tdef page pointer (0 if none)       |
// +------+---------+-------------+------------------------------------------+
//
//
// +-------------------------------------------------------------------------+
// | Jet4 Table Definition Block (55 bytes)                                  |
// +------+---------+-------------+------------------------------------------+
// | data | length  | name        | description                              |
// +------+---------+-------------+------------------------------------------+
// |      | 4 bytes | tdef_len    | Length of the data for this page         |
// |      | 4 bytes | unknown     | unknown                                  |
// |      | 4 bytes | num_rows    | Number of records in this table          |
// | 0x00 | 4 bytes | autonumber  | value for the next value of the          |
// |      |         |             | autonumber column, if any. 0 otherwise   |
// | 0x01 | 1 byte  | autonum_flag| 0x01 makes autonumbers work in access    |
// |      | 3 bytes | unknown     | unknown                                  |
// | 0x00 | 4 bytes | ct_autonum  | autonumber value for complex type column(s) |
// |      |         |             | (shared across all columns in the table) |
// |      | 8 bytes | unknown     | unknown                                  |
// | 0x4e | 1 byte  | table_type  | 0x4e: user table, 0x53: system table     |
// |      | 2 bytes | max_cols    | Max columns a row will have (deletions)  |
// |      | 2 bytes | num_var_cols| Number of variable columns in table      |
// |      | 2 bytes | num_cols    | Number of columns in table (repeat)      |
// |      | 4 bytes | num_idx     | Number of logical indexes in table       |
// |      | 4 bytes | num_real_idx| Number of index entries                  |
// |      | 4 bytes | used_pages  | Points to a record containing the        |
// |      |         |             | usage bitmask for this table.            |
// |      | 4 bytes | free_pages  | Points to a similar record as above,     |
// |      |         |             | listing pages which contain free space.  |
// +-------------------------------------------------------------------------+
// | Iterate for the number of num_real_idx (12 bytes per idxs)              |
// +-------------------------------------------------------------------------+
// | ...
// +-------------------------------------------------------------------------+
// | Iterate for the number of num_cols (25 bytes per column)                |
// +-------------------------------------------------------------------------+
// |      | 1 byte  | col_type    | Column Type (see table below)            |
// |      | 4 bytes | unknown     | matches first unknown definition block   |
// |      | 2 bytes | col_num     | Column Number (includes deleted columns) |
// |      | 2 bytes | offset_V    | Offset for variable length columns       |
// |      | 2 bytes | col_num     | Column Number                            |
// |      | 2 bytes | misc        | prec/scale (1 byte each), or sort order  |
// |      |         |             | for textual columns(0x409=General)       |
// |      |         |             | or "complexid" for complex columns (4bytes)|
// |      | 2 bytes | misc_ext    | text sort order version num is 2nd byte  |
// |      | 1 byte  | bitmask     | See column flags below                   |
// |      | 1 byte  | misc_flags  | 0x01 for compressed unicode              |
// | 0000 | 4 bytes | ???         |                                          |
// |      | 2 bytes | offset_F    | Offset for fixed length columns          |
// |      | 2 bytes | col_len     | Length of the column (0 if memo/ole)     |
// +-------------------------------------------------------------------------+
// | Iterate for the number of num_cols (n*2 bytes per column)               |
// +-------------------------------------------------------------------------+
// |      | 2 bytes | col_name_len| len of the name of the column            |
// |      | n bytes | col_name    | Name of the column (UCS-2 format)        |
// +-------------------------------------------------------------------------+
//
// -----------------------------------------------------------------------
function getTableDefinitionForPage(pageNum) {

    //
    // go to the page which defines the table
    //
    tempoffset = 4096 * pageNum


    //
    // get the table header
    //
    wholeDb.table_pages[pageNum].header = {}
    let PageSignature = find(tempoffset, 1, "number")  // 0x02 means table deinition page
    wholeDb.table_pages[pageNum].header.PageSignature = PageSignature
    let freeBytes = find(tempoffset + 2, 2, "number")
    wholeDb.table_pages[pageNum].header.freeSpaceInThisPageMinus8 = freeBytes
    let NextPage = find(tempoffset + 4, 4, "number")
    wholeDb.table_pages[pageNum].header.NextPage = NextPage
    tempoffset = tempoffset + 8


    //
    // get the table definition
    //
    wholeDb.table_pages[pageNum].definition = {}
    let TableDefinitionLength = find(tempoffset, 4, "number")
    wholeDb.table_pages[pageNum].definition.TableDefinitionLength = TableDefinitionLength


    let Numberofrows = find(tempoffset + 8, 4, "number")
    wholeDb.table_pages[pageNum].definition.Numberofrows = Numberofrows


    tempoffset = tempoffset + 12
    let Autonumber = find(tempoffset, 4, "number")
    wholeDb.table_pages[pageNum].definition.Autonumber = Autonumber

    tempoffset = tempoffset + 4

    let AutonumberIncrement = getVar({useJetVersion: 4,length: 4,name: "Autonumber Increment",type: "number"})
    wholeDb.table_pages[pageNum].definition.Autonumber = Autonumber

    getVar({useJetVersion: 4,length: 4,name: "Complex Autonumber",showas: "number"})
    getVar({useJetVersion: 4,length: 4,name: "Unknown"})
    getVar({useJetVersion: 4,length: 4,name: "Unknown"})

    let Flags = getVar({length: 1,name: "Table Type / Flags?",type: "number",showas: "hex"})
    wholeDb.table_pages[pageNum].definition.Flags = Flags

    let NextColumnId = getVar({length: 2,name: "Next Column Id",type: "number"})
    wholeDb.table_pages[pageNum].definition.NextColumnId = NextColumnId

    let VariableColumns = getVar({length: 2,name: "Variable columns",type: "number"})
    wholeDb.table_pages[pageNum].definition.VariableColumnsCount = VariableColumns

    let colCount = getVar({length: 2,name: "Column Count",type: "number"})
    wholeDb.table_pages[pageNum].definition.TotalColumnCount = colCount

    let indexCount = getVar({length: 4,name: "Index Count",type: "number"})
    wholeDb.table_pages[pageNum].definition.indexCount = indexCount

    let RealIndexCount = getVar({length: 4,name: "Real Index Count",type: "number"})
    wholeDb.table_pages[pageNum].definition.RealIndexCount = RealIndexCount

    let RowPageMapRecord = getVar({length: 1,name: "Row Page Map record",type: "number"  })
    wholeDb.table_pages[pageNum].definition.RowPageMapRecord = RowPageMapRecord

    var RowPageMapPage = getVar({length: 3,name: "Row Page Map Page",type: "number"})
    wholeDb.table_pages[pageNum].definition.RowPageMapPage = RowPageMapPage

    let FreeSpacePageMapRecord = getVar({length: 1,name: "Free Space Page Map Record",type: "number" })
    wholeDb.table_pages[pageNum].definition.FreeSpacePageMapRecord = FreeSpacePageMapRecord

    let FreeSpacePageMapPage = getVar({length: 3,name: "Free Space Page Map Page",type: "number"})
    wholeDb.table_pages[pageNum].definition.FreeSpacePageMapPage = FreeSpacePageMapPage


    //
    // skip indexes
    //
    // for every real index :
    //
    // Unknown A1	4 bytes	???
    // Index Row Count	4 bytes	UINT 32 LE	Unknown
    // Unknown A2	4 bytes	???	Jet 4 only, always 0
    //
    tempoffset = tempoffset + (12 * RealIndexCount)


    //
    // get the definition of all the cols
    //
    let columns = {}
    let columnNames = {}
    let fixedColsList = []
    let colIdList = {}

    for (var x=0; x< colCount; x++) {

        let newColumn = new Object()

        let colType = getVar({length: 1,name: "col Type",type: "number"})
        newColumn.colType = colType
        newColumn.colTypeText = getColumnType(colType)
        //console.log("Col type: " + getColumnType(colType))

        getVar({useJetVersion: 4,length: 4,name: "Unknown"})
        let ColID = getVar({length: 2,name: "Col ID",type: "number"})
        let VariableColumnNumber = getVar({length: 2,name: "Variable Column Number",type: "number"})
        let ColumnIndex = getVar({length: 2,name: "Column Index",type: "number"})
        getVar({useJetVersion: 4,length: 4,name: "Various" })
        let ColFlags = getVar({useJetVersion: 4,length: 1,name: "Col Flags"})
        let fixedLength = false
        if (ColFlags[0] & 0x01) {
            fixedLength = true
            fixedColsList.push(x)
        }
        colIdList[ColID] = x

        let canBeNull = false
        if (ColFlags[0] & 0x02) {
            canBeNull = true
        }

        let autonumber = false
        if (ColFlags[0] & 0x04 ) {
            autonumber = true
        }
        getVar({useJetVersion: 4,length: 1,name: "Col Flags2"})

        getVar({useJetVersion: 4,length: 4,name: "Unknown"})
        let FixedOffset = getVar({length: 2,name: "Fixed offset",type: "number"})
        let colDataLen = getVar({length: 2,name: "Length",type: "number"})
        newColumn.ColID = ColID
        newColumn.length = colDataLen
        newColumn.FixedOffset = FixedOffset
        newColumn.ColumnIndex = ColumnIndex
        newColumn.VariableColumnNumber = VariableColumnNumber
        newColumn.fixedLength = fixedLength
        newColumn.canBeNull = canBeNull
        newColumn.autonumber = autonumber
        newColumn.ColFlags = "0x" + ":0x" + ColFlags[0].toString(16)

        //columns[ColID] = newColumn
        columns[x] = newColumn

    }
    console.log(" ")
    console.log(" ")
    console.log(" ")

    wholeDb.table_pages[pageNum].col_defns = {}
    for (var x=0; x< colCount; x++) {

        let colLen = getVar({length: 2,name: "col length",type: "number"})

        let colname = getVar({length: colLen,name: "col name"})

        let tttt=toUTF8Array(colname)


        //console.log("colname: " + colname)
        //console.log("columns[" + x + "]: " + columns[x])

        let colNum = x
        columns[ colNum ].name =  tttt
        columnNames[tttt] = colNum
        wholeDb.table_pages[pageNum].col_defns[ colNum ] = columns[ colNum ]
    }
    wholeDb.table_pages[pageNum].columnNames = columnNames
    wholeDb.table_pages[pageNum].fixedColsList = fixedColsList
    wholeDb.table_pages[pageNum].colIdList = colIdList



}




// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function getColName(pageNum, varIndex) {

    return    ( (wholeDb.table_pages[pageNum].col_defns[varIndex].name) +
                    (wholeDb.table_pages[pageNum].col_defns[varIndex].fixedLength?" (fixed)":" (var)") ).padEnd(25, ' ')
    //return varIndex
}




// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function toUTF8Array(input) {
    let s=""
    for (let x=0;x<input.length;x=x+2){
        s=s + String.fromCharCode(input[x])
    }
    return s
}







// -----------------------------------------------------------------------
//
//                    +------------------------------------+
//                    |  populateDataForTableDefinedOnPage |
//                    +------------------------------------+
//
//
// +--------------------------------------------------------------------------+
// | Jet4 Data Page Definition                                                |
// +------+---------+---------------------------------------------------------+
// | data | length  | name       | description                                |
// +------+---------+---------------------------------------------------------+
// | 0x01 | 1 byte  | page_type  | 0x01 indicates a data page.                |
// |      | 1 byte  | unknown    |                                            |
// |      | 2 bytes | free_space | Free space in this page                    |
// |      | 4 bytes | tdef_pg    | Page pointer to table definition           |
// |      | 4 bytes | unknown    |                                            |
// |      | 2 bytes | num_rows   | number of records on this page             |
// +--------------------------------------------------------------------------+
// | Iterate for the number of records                                        |
// +--------------------------------------------------------------------------+
// |      | 2 bytes | offset_row | The record's location on this page         |
// +--------------------------------------------------------------------------+
//
//
// +--------------------------------------------------------------------------+
// | Jet4 Row Definition                                                      |
// +------+---------+---------------------------------------------------------+
// | data | length  | name       | description                                |
// +------+---------+---------------------------------------------------------+
// |      | 2 bytes | num_cols   | Number of columns stored on this row.      |
// |      | n bytes | fixed_cols | Fixed length columns                       |
// |      | n bytes | var_cols   | Variable length columns                    |
// |      | 2 bytes | eod        | length of data from begining of record     |
// |      | n bytes | var_table[]| offset from start of row for each var_col  |
// |      | 2 bytes | var_len    | number of variable length columns          |
// |      | n bytes | null_mask  | Null indicator.  See notes.                |
// +--------------------------------------------------------------------------+
//
// -----------------------------------------------------------------------
function populateDataForTableDefinedOnPage(  pageNum  ) {

    let tableData          = []                                        // list of rows of data
    let table_pages        = wholeDb.table_pages[ pageNum ]              // table definitions

    //
    // find all the data pages for this table. stored in
    // "wholeDb.table_pages.data_pages[  pageNum  ]"
    //
    for (   let dataPageIndex = 0;   dataPageIndex < table_pages.data_pages.length;   dataPageIndex++   ) {

        let dataPageNum = table_pages.data_pages[ dataPageIndex ].pagenum
        tempoffset = 4096 * dataPageNum

        let DataPageSignature = getVar({length:   1,name:    "DataPageSignature",type:    "number"})

        //
        // for each data page first read the header of the data page
        //
        getVar({ length: 1, name: "Unknown", type: "number"})
        let FreeSpace = getVar({length: 2, name: "Free Space", type: "number"})
        let tdef_pg = getVar({length: 3,name: "tdef_pg",type: "number"})
        let pgr = getVar({length: 1,name: "tdef_pg record",type: "number"})
        getVar({length: 4,name: "Unknown",type: "number"})
        let RecordCount = getVar({length: 2,name: "RecordCount",type: "number"})
        let NullFieldBitmapLength = Math.floor((wholeDb.table_pages[pageNum].TotalColumnCount + 7) / 8)

        //
        // Since we are given the record count for how many records are stored
        // on this data page in "RecordCount" we can go through and find all
        // the record positions on this page since we are given the offsets
        //
        let recordPosOffsetFromStartOfPage = []
        let lastEnd = (4096 * dataPageNum) + 4096 - 1
        for (let recIndex = 0 ; recIndex < RecordCount; recIndex++)
        {
            let RawRecordOffset = getVar({length: 2,name: "RecordOffset",type: "number"})
            let newRecordMetaData = {
                RawRecordOffset:    RawRecordOffset
                ,
                valid:              true
            }
            if (RawRecordOffset == 0) {
                newRecordMetaData.valid = false

            } else if (RawRecordOffset & 0x4000) {
                newRecordMetaData.valid = false
                newRecordMetaData.overflow = true
                newRecordMetaData.RealOffset = RawRecordOffset - 0x4000

            } else if (RawRecordOffset & 0x8000) {
                newRecordMetaData.deleted = true
                newRecordMetaData.valid = false
                newRecordMetaData.RealOffset = RawRecordOffset - 0x8000
            } else {
                newRecordMetaData.RealOffset = RawRecordOffset

            }
            newRecordMetaData.start = (4096 * dataPageNum) + newRecordMetaData.RealOffset
            newRecordMetaData.end = lastEnd
            newRecordMetaData.length = (newRecordMetaData.end - newRecordMetaData.start) + 1
            lastEnd = newRecordMetaData.start - 1

            recordPosOffsetFromStartOfPage.push( newRecordMetaData )
        }

        //
        // Now that we have all the positions of the records within this data page
        // stored in "recordPosOffsetFromStartOfPage" we can go through all the records
        //
        let NumCols     = Object.keys(wholeDb.table_pages[pageNum].col_defns).length
        let numFixed    = wholeDb.table_pages[pageNum].definition.TotalColumnCount -
                            wholeDb.table_pages[pageNum].definition.VariableColumnsCount

        //
        // for every record on this data page
        //
        for (let record_index = 0;record_index < RecordCount; record_index ++) {
            tableRecord = {
                meta: {
                    data_page: dataPageNum
                }
                ,
                data: {
                }
            }
            tableData.push(tableRecord)

            if (recordPosOffsetFromStartOfPage[record_index].valid) {
                tempoffset = recordPosOffsetFromStartOfPage[record_index].start
                let NumCols = getVar({ length: 2, name: "NumCols", type: "number" })
                tableRecord.meta.NumCols = NumCols
                for (let yy=0 ;yy < numFixed ; yy++)
                {
                    let coIn = (numFixed - 1) - yy
                    let fixedColRealIndex = wholeDb.table_pages[pageNum].fixedColsList[coIn]
                    let fixedColDefn = wholeDb.table_pages[pageNum].col_defns[fixedColRealIndex]

                    tempoffset = recordPosOffsetFromStartOfPage[record_index].start + fixedColDefn.FixedOffset + 2


                    let colVal = getVar({
                       length: fixedColDefn.length,
                       name: fixedColDefn.name,
                       type: "number"
                    })

                    tableRecord.data[fixedColDefn.name.padEnd(25, ' ')] = colVal
//zzz

                }

                let NullFieldBitmapLength = Math.floor((wholeDb.table_pages[pageNum].definition.TotalColumnCount + 7) / 8)

                tempoffset = (recordPosOffsetFromStartOfPage[record_index].end - NullFieldBitmapLength) + 1
                tempoffset = tempoffset - 2

                let VarLenCount = getVar({
                   length: 2,
                   name: "VarLenCount",
                   type: "number"
                })

                let FieldMask = getVar({
                   length: NullFieldBitmapLength,
                   name: "FieldMask",
                   type: "number"
                })

                let maskedFields = {}
                let notNullVarList = []

                for (   let recIndex = 0;
                        recIndex < wholeDb.table_pages[pageNum].definition.TotalColumnCount;
                        recIndex ++   )
                {
                   let realColId = wholeDb.table_pages[pageNum].colIdList["" + recIndex]
                    //let realColId = recIndex
                    let maskBit = Math.pow(2, recIndex)
                    if (FieldMask & maskBit) {
                        maskedFields[getColName(pageNum,realColId)] = ""
                        if (!wholeDb.table_pages[pageNum].col_defns[realColId].fixedLength) {
                            let notNullVarName
                            notNullVarName = wholeDb.table_pages[pageNum].col_defns[realColId].name
                            notNullVarList.push(notNullVarName)

                        }
                    } else {
                        //maskedFields[getColName(pageNum,realColId)] = "null"
                        let notNullVarName
                        notNullVarName = wholeDb.table_pages[pageNum].col_defns[realColId].name
                        notNullVarList.push(notNullVarName)
                        tableRecord.data[notNullVarName.padEnd(25, ' ')] = null
                    }
                }
                tableRecord.meta.__var_count = VarLenCount
                //tableRecord.meta._mask = maskedFields






                tempoffset = recordPosOffsetFromStartOfPage[record_index].end - NullFieldBitmapLength - 1
                let lastOffset = tempoffset
                let VariableLengthFieldCount = getVar({length: 2,name: "VariableLengthFieldCount",type: "number"})


                let listOfOffsets = []
                let listOfOffsetsRaw = []
                let endRec = lastOffset
                for (let varIndex=0; varIndex < VariableLengthFieldCount;varIndex++){

                    tempoffset = lastOffset - 2
                    lastOffset = tempoffset
                    let VariableLengthFieldOffset = getVar({length: 2,name: "VariableLengthFieldOffset",type: "number"})
                    listOfOffsetsRaw.push(VariableLengthFieldOffset)
                    if ((varIndex == 0 ) || (listOfOffsetsRaw[varIndex] != listOfOffsetsRaw[varIndex - 1])) {
                        listOfOffsets.push({relative_offset: VariableLengthFieldOffset,start: recordPosOffsetFromStartOfPage[record_index].start + VariableLengthFieldOffset})
                    }
                }

                for (let varIndex=0; varIndex < listOfOffsets.length;varIndex++) {

                    if (varIndex == (listOfOffsets.length - 1) ) {
                        let varColData = listOfOffsets[ varIndex ]
                        varColData.length = 2
                        varColData.end = varColData.start + 2
                    } else {
                        let varColData = listOfOffsets[ varIndex ]
                        let nextColData = listOfOffsets[ varIndex + 1 ]
                        varColData.length = nextColData.relative_offset - varColData.relative_offset
                        varColData.end = nextColData.start - 1
                    }

                }

                for (let i=0;i<20;i++){
                    tempoffset = lastOffset - 2
                    lastOffset = tempoffset
                    let Eod = getVar({length: 2,name: "Eod",type: "number"})
                }

                for (let varIndex=0; varIndex < listOfOffsets.length;varIndex++){

                    tempoffset = listOfOffsets[varIndex].start

                    let varName = notNullVarList[varIndex]
                    if (varName) {
                            varName = varName.padEnd(25, ' ')
                    }

                    if (listOfOffsets[varIndex].length  == 2) {
                        let VariableLengthFieldOffset = getVar({length: listOfOffsets[varIndex].length ,
                            name: "VariableLengthFieldOffset",type:"number"})

                        tableRecord.data[varName] = VariableLengthFieldOffset

                    } else {
                        let VariableLengthFieldOffset = getVar({length: listOfOffsets[varIndex].length ,
                            name: "VariableLengthFieldOffset"})
//
                        tableRecord.data[varName] = toUTF8Array(VariableLengthFieldOffset)
                    }
                }
                tableRecord.meta = null
            }
        }
    }
    wholeDb.table_pages[pageNum].data = {}

    wholeDb.table_pages[pageNum].data = tableData
}









}
