exports.load = function(fileName) {

console.log("Load Access file: " + fileName);

//2,4, 5, 18, 42
let defnPage            = 2
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
getDataForTableOnPage(defnPage)



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






// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function findDataPages() {
    let listOfTableDefPages = {}
    for (let currentPage = 0 ; currentPage < numPages; currentPage++){
        tempoffset = 4096 * currentPage
        let PageSignature = getVar({
              length: 1,
              name: "Page Type",
              type: "number"
           })
        if (PageSignature == 0x01) {
           getVar({
              length: 1,
              name: "Unknown",
              type: "number"
           })

            getVar({
               length: 2,
               name: "Free Space",
               type: "number"
           })
           let tdef_pg = getVar({
              length: 3,
              name: "tdef_pg",
              type: "number"
           })

           if (tdef_pg < 2) {

           } else if (tdef_pg > 10000) {

           } else if (!listOfTableDefPages[tdef_pg]) {
               listOfTableDefPages[tdef_pg] = {
                   pages: [currentPage]
               }

           } else {
               listOfTableDefPages[tdef_pg].pages.push(currentPage)
           }
        }
    }

    wholeDb.tableDataPages = listOfTableDefPages

}




// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function getTableDefinitionForPage(pageNum) {

    tempoffset = 4096 * pageNum
    if (showDebug){
        console.log("")
        console.log("")
        console.log("")
        console.log("----------------------------------------------------------------------------------------------------------------")
        console.log("------                                    TABLE DEFNS PAGE HEADER                                     ----------")
        console.log("------                                    offset: " + tempoffset + "                               ")
        console.log("----------------------------------------------------------------------------------------------------------------")
    }


    PageSignature = find(tempoffset, 2, "number")
    wholeDb.tableDataPages[pageNum].PageSignature = PageSignature
    VC = find(tempoffset + 2, 2, "number")
    wholeDb.tableDataPages[pageNum].VC = VC
    NextPage = find(tempoffset + 4, 4, "number")
    wholeDb.tableDataPages[pageNum].NextPage = NextPage


    tempoffset = tempoffset + 8


    let TableDefinitionLength = find(tempoffset, 4, "number")
    wholeDb.tableDataPages[pageNum].TableDefinitionLength = TableDefinitionLength


    let Numberofrows = find(tempoffset + 8, 4, "number")
    wholeDb.tableDataPages[pageNum].Numberofrows = Numberofrows


    tempoffset = tempoffset + 12
    let Autonumber = find(tempoffset, 4, "number")
    wholeDb.tableDataPages[pageNum].Autonumber = Autonumber



    tempoffset = tempoffset + 4

    let AutonumberIncrement = getVar({
        useJetVersion: 4,
        length: 4,
        name: "Autonumber Increment",
        type: "number"
    })
    wholeDb.tableDataPages[pageNum].Autonumber = Autonumber


    getVar({
        useJetVersion: 4,
        length: 4,
        name: "Complex Autonumber",
        showas: "number"
    })

    getVar({
        useJetVersion: 4,
        length: 4,
        name: "Unknown"
    })

    getVar({
        useJetVersion: 4,
        length: 4,
        name: "Unknown"
    })

    let Flags = getVar({
        length: 1,
        name: "Table Type / Flags?",
        type: "number",
        showas: "hex"
    })
    wholeDb.tableDataPages[pageNum].Flags = Flags


    let NextColumnId = getVar({
        length: 2,
        name: "Next Column Id",
        type: "number"
    })
    wholeDb.tableDataPages[pageNum].NextColumnId = NextColumnId


    let VariableColumns = getVar({
        length: 2,
        name: "Variable columns",
        type: "number"
    })
    wholeDb.tableDataPages[pageNum].__VariableColumns = VariableColumns


    let colCount = getVar({
        length: 2,
        name: "Column Count",
        type: "number",
        show: true
    })
    wholeDb.tableDataPages[pageNum].__colCount = colCount


    let indexCount = getVar({
        length: 4,
        name: "Index Count",
        type: "number"
    })
    wholeDb.tableDataPages[pageNum].indexCount = indexCount

    let RealIndexCount = getVar({
        length: 4,
        name: "Real Index Count",
        type: "number"
    })
    wholeDb.tableDataPages[pageNum].RealIndexCount = RealIndexCount

    let RowPageMapRecord = getVar({
        length: 1,
        name: "Row Page Map record",
        type: "number",
        show: true
    })
    wholeDb.tableDataPages[pageNum].RowPageMapRecord = RowPageMapRecord

    var RowPageMapPage = getVar({
        length: 3,
        name: "Row Page Map Page",
        type: "number",
        show: true
    })
    wholeDb.tableDataPages[pageNum].RowPageMapPage = RowPageMapPage

    let FreeSpacePageMapRecord = getVar({
        length: 1,
        name: "Free Space Page Map Record",
        type: "number",
        show: true
    })
    wholeDb.tableDataPages[pageNum].FreeSpacePageMapRecord = FreeSpacePageMapRecord

    let FreeSpacePageMapPage = getVar({
        length: 3,
        name: "Free Space Page Map Page",
        type: "number",
        show: true
    })
    wholeDb.tableDataPages[pageNum].FreeSpacePageMapPage = FreeSpacePageMapPage

    //
    // skip indexes
    // for every real index :
    //
    // Unknown A1	4 bytes	???
    // Index Row Count	4 bytes	UINT 32 LE	Unknown
    // Unknown A2	4 bytes	???	Jet 4 only, always 0
    //
    tempoffset = tempoffset + (12 * RealIndexCount)



    let columns = {}
    let columnNames = {}
    let fixedColsList = []

    for (var x=0; x< colCount; x++) {
        let newColumn = new Object()
        let colType = getVar({
            length: 1,
            name: "col Type",
            type: "number"
        })
        newColumn.colType = getColumnType(colType)
        //console.log("Col type: " + getColumnType(colType))
        columns[x] = newColumn
        getVar({
            useJetVersion: 4,
            length: 4,
            name: "Unknown"
        })
        let ColID = getVar({
            length: 2,
            name: "Col ID",
            type: "number"
        })
        let VariableColumnNumber = getVar({
            length: 2,
            name: "Variable Column Number",
            type: "number"
        })
    let ColumnIndex =     getVar({
             length: 2,
            name: "Column Index",
            type: "number"
        })
        getVar({
            useJetVersion: 4,
            length: 4,
            name: "Various"
            //showas: "hex"
        })
        let ColFlags = getVar({
            useJetVersion: 4,
            length: 2,
            name: "Col Flags"
            //showas: "hex"
        })
        let fixedLength = false
        if (ColFlags[0] & 0x01) {
            fixedLength = true
            fixedColsList.push(x)
        }

        let canBeNull = false
        if (ColFlags[0] & 0x02) {
            canBeNull = true
        }

        let autonumber = false
        if (ColFlags[0] & 0x04 ) {
            autonumber = true
        }

        getVar({
            useJetVersion: 4,
            length: 4,
            name: "Unknown"
            ,
            show: false
        })
        let FixedOffset = getVar({
            length: 2,
            name: "Fixed offset",
            type: "number"
            ,
            show: false
        })
        let colDataLen = getVar({
            length: 2,
            name: "Length",
            type: "number"
            ,
            show: false
        })
        newColumn.ColID = ColID
        newColumn.length = colDataLen
        newColumn.FixedOffset = FixedOffset
        newColumn.ColumnIndex = ColumnIndex
        newColumn.VariableColumnNumber = VariableColumnNumber
        newColumn.fixedLength = fixedLength
        newColumn.canBeNull = canBeNull
        newColumn.autonumber = autonumber
        newColumn.ColFlags = "0x" + ColFlags[1].toString(16) + ":0x" + ColFlags[0].toString(16)
    }
    console.log(" ")
    console.log(" ")
    console.log(" ")

    wholeDb.tableDataPages[pageNum].colsInOrder = {}
    for (var x=0; x< colCount; x++) {

        let colLen = getVar({
            length: 2,
            name: "col length",
            type: "number"
            ,
            show: false
        })

        let colname = getVar({
            length: colLen,
            name: "col name"
        })

        let tttt=toUTF8Array(colname)


        //console.log("colname: " + colname)
        //console.log("columns[" + x + "]: " + columns[x])

        columns[x].name =  tttt
        columnNames[tttt] = x
        wholeDb.tableDataPages[pageNum].colsInOrder[x] = columns[x]
    }
    wholeDb.tableDataPages[pageNum].columnNames = columnNames
    wholeDb.tableDataPages[pageNum].fixedColsList = fixedColsList



    //
    //
    //

    console.log("...............")
    console.log("")
    tempoffset = (RowPageMapPage * 4096) + (64 * RowPageMapRecord)//(RowPageMapPage * 4096) //+ (2 * RecordCount)
    console.log("RowPageMapPage: " + RowPageMapPage)
    console.log("RowPageMapRecord: " + RowPageMapRecord)
    console.log("offset: " + tempoffset)

    let mapType = getVar({
        length: 1,
        name: "mapType",
        type: "number"
    })

    console.log("mapType: " + mapType)

    for (let rt=0;rt<17;rt++) {

        var PageUsageMapRecord = getVar({
            length: 0,
            name: "Page Usage Map Record",
            type: "number",
            show: true
        })

        var PageUsageMapPage = getVar({
            length: 4,
            name: "Page Usage Map Page",
            type: "number",
            show: true
        })
        console.log("PageUsageMapPage: " + PageUsageMapPage + ":" + PageUsageMapRecord)


    }

    console.log("")
    console.log("...............")
    return wholeDb.tableDataPages[pageNum]
}






// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function getFixedColName(pageNum, varIndex) {
    //zzz
    return varIndex
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
//
//
//
// -----------------------------------------------------------------------
function getDataForTableOnPage(pageNum) {
    let tableData = []

    if (showDebug){
        console.log("")
        console.log("")
        console.log("")
        console.log("----------------------------------------------------------------------------------------------------------------")
        console.log("------                                    DATA FOR TABLE                                    ")
        console.log("------                                    page: " + pageNum + "                               ")
        console.log("----------------------------------------------------------------------------------------------------------------")
    }

    let listOfPages = wholeDb.tableDataPages[pageNum]



    console.log("Table defn: " + pageNum + " has data pages " + JSON.stringify(listOfPages.pages,null,2))

    for (let dataOffset = 0;dataOffset< listOfPages.pages.length;dataOffset++) {
        console.log("")
        console.log("")
        //console.log("dataOffset: " + dataOffset )
        let dataPageNum = listOfPages.pages[dataOffset]
        console.log( "                           /------------------------------\\")
        console.log( "                           | data page: " + dataPageNum )
        console.log( "                           \\------------------------------/")
        console.log( "")
        tempoffset = 4096 * dataPageNum



        let DataPageSignature = getVar({
           length: 1,
           name: "DataPageSignature",
           type: "number",
           showas: "hex"
           , show: false})

        getVar({
           length: 1,
           name: "Unknown",
           type: "number"
           , show: false
        })

        let FreeSpace = getVar({
            length: 2,
            name: "Free Space",
            type: "number"
            , show: false
        })

        let tdef_pg = getVar({
           length: 3,
           name: "tdef_pg",
           type: "number"
           , show: false
        })

        let pgr = getVar({
           length: 1,
           name: "tdef_pg record",
           type: "number"
           , show: false
        })
        let Owner = getVar({
           length: 4,
           name: "Unknown",
           type: "number"
           , show: false
        })
        let RecordCount = getVar({
           length: 2,
           name: "RecordCount",
           type: "number"
        })
        let NullFieldBitmapLength = Math.floor((wholeDb.tableDataPages[pageNum].__colCount + 7) / 8)


        let offsetList = []
        let lastEnd = (4096 * dataPageNum) + 4096 - 1
        for (let recIndex = 0 ; recIndex < RecordCount; recIndex++) {

            let RawRecordOffset = getVar({
               length: 2,
               name: "RecordOffset",
               type: "number"
            })
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


            offsetList.push( newRecordMetaData )

            //console.log("Record: " + recIndex + ": " + JSON.stringify(newRecordMetaData,null,2))

        }



        let NumCols = Object.keys(wholeDb.tableDataPages[pageNum].colsInOrder).length
        //console.log(wholeDb.tableDataPages[pageNum].colsInOrder)
        let numFixed = wholeDb.tableDataPages[pageNum].__colCount - wholeDb.tableDataPages[pageNum].__VariableColumns
        console.log("                           " +
            numFixed + " Fixed + " + wholeDb.tableDataPages[pageNum].__VariableColumns + " Variable  = " + wholeDb.tableDataPages[pageNum].__colCount + " cols")
        let fixedCount = 0
        console.log("                           RecordCount: " + RecordCount)
        console.log("                           FreeSpace: " + FreeSpace)
        console.log("                           Table defn page: " + tdef_pg)
        console.log("                           Owner: " + Owner)
        console.log("")
        console.log("")
        console.log("")
        console.log("")
        console.log("")
        console.log("")

        for (let rc = 0;rc < RecordCount; rc ++) {
            tableRecord = {}
            tableData.push(tableRecord)

            console.log("RecordID: " + rc)
            if (offsetList[rc].valid) {
                console.log( offsetList[rc].RealOffset + " - " + (offsetList[rc].RealOffset + offsetList[rc].length - 1))
                tempoffset = offsetList[rc].start
                let NumCols = getVar({
                    length: 2,
                    name: "NumCols",
                    type: "number"
                })
                console.log("NumCols: " + NumCols)

                console.log("Fixed col data:")
                console.log("------")
                //for (let rowIndex=0;rowIndex < RowCount; rowIndex++){
                    for (let yy=0;yy < wholeDb.tableDataPages[pageNum].__colCount; yy++){
                        if (wholeDb.tableDataPages[pageNum].colsInOrder[yy].fixedLength) {
                            //console.log("Fixed col: " + wholeDb.tableDataPages[pageNum].colsInOrder[yy].name + " = " + wholeDb.tableDataPages[pageNum].colsInOrder[yy].length + " bytes")
                            let colVal = getVar({
                               length: wholeDb.tableDataPages[pageNum].colsInOrder[yy].length,
                               name: wholeDb.tableDataPages[pageNum].colsInOrder[yy].name,
                               type: "number"
                            })
                        }
                    }

                    console.log("")

                    console.log("NullFieldBitmapLength: " + NullFieldBitmapLength)
                    tempoffset = offsetList[rc].end - NullFieldBitmapLength - 1
                    let lastOffset = tempoffset
                    let VariableLengthFieldCount = getVar({
                       length: 2,
                       name: "VariableLengthFieldCount",
                       type: "number"
                    })
                    console.log("VariableLengthFieldCount:" + VariableLengthFieldCount)

                    console.log("")
                    console.log("")
                    console.log("")


                    let listOfOffsets = []
                    let listOfOffsetsRaw = []
                    let endRec = lastOffset
                    for (let varIndex=0; varIndex < VariableLengthFieldCount;varIndex++){

                        tempoffset = lastOffset - 2
                        lastOffset = tempoffset
                        let VariableLengthFieldOffset = getVar({
                           length: 2,
                           name: "VariableLengthFieldOffset",
                           type: "number"
                        })
                        listOfOffsetsRaw.push(VariableLengthFieldOffset)
                        if ((varIndex == 0 ) || (listOfOffsetsRaw[varIndex] != listOfOffsetsRaw[varIndex - 1])) {
                            listOfOffsets.push({relative_offset: VariableLengthFieldOffset,
                                                start: offsetList[rc].start + VariableLengthFieldOffset})
                            console.log("VariableLengthFieldOffset:" + VariableLengthFieldOffset)
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
                    console.log("Variable fields:" + JSON.stringify(listOfOffsets,null,2))

                    for (let i=0;i<20;i++){
                        tempoffset = lastOffset - 2
                        lastOffset = tempoffset
                        let Eod = getVar({
                           length: 2,
                           name: "Eod",
                           type: "number"
                        })
                        if (showDebug){
                            console.log("Eod:" + Eod)
                        }
                    }
                    console.log("")
            //}

                for (let varIndex=0; varIndex < listOfOffsets.length;varIndex++){

                    tempoffset = listOfOffsets[varIndex].start
                    if (listOfOffsets[varIndex].length  == 2) {
                        let VariableLengthFieldOffset = getVar({
                           length: listOfOffsets[varIndex].length ,
                           name: "VariableLengthFieldOffset",
                           type: "number"
                        })
                        if (showDebug) {
                            console.log("Val:" + VariableLengthFieldOffset)
                        }
                        tableRecord[getFixedColName(pageNum, varIndex)] = VariableLengthFieldOffset

                    } else {
                        let VariableLengthFieldOffset = getVar({
                           length: listOfOffsets[varIndex].length ,
                           name: "VariableLengthFieldOffset"
                        })
                        //console.log("Val:" + toUTF8Array(VariableLengthFieldOffset))
                        if (showDebug) {
                            console.log("Val:" + VariableLengthFieldOffset)
                        }
                        tableRecord[getFixedColName(pageNum, varIndex)] = toUTF8Array(VariableLengthFieldOffset)
                    }
                    //zzz
                }

            }

            console.log("")
            console.log("")
            console.log("")
            console.log("")
            console.log("")
            console.log("")
        }
        console.log("")
        console.log("")


    }
    return tableData
}









}
