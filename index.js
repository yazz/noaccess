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

    wholeDb.tableDefinition = listOfTableDefPages

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
    wholeDb.tableDefinition[pageNum].PageSignature = PageSignature
    VC = find(tempoffset + 2, 2, "number")
    wholeDb.tableDefinition[pageNum].VC = VC
    NextPage = find(tempoffset + 4, 4, "number")
    wholeDb.tableDefinition[pageNum].NextPage = NextPage


    tempoffset = tempoffset + 8


    let TableDefinitionLength = find(tempoffset, 4, "number")
    wholeDb.tableDefinition[pageNum].TableDefinitionLength = TableDefinitionLength


    let Numberofrows = find(tempoffset + 8, 4, "number")
    wholeDb.tableDefinition[pageNum].Numberofrows = Numberofrows


    tempoffset = tempoffset + 12
    let Autonumber = find(tempoffset, 4, "number")
    wholeDb.tableDefinition[pageNum].Autonumber = Autonumber



    tempoffset = tempoffset + 4

    let AutonumberIncrement = getVar({
        useJetVersion: 4,
        length: 4,
        name: "Autonumber Increment",
        type: "number"
    })
    wholeDb.tableDefinition[pageNum].Autonumber = Autonumber


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
    wholeDb.tableDefinition[pageNum].Flags = Flags


    let NextColumnId = getVar({
        length: 2,
        name: "Next Column Id",
        type: "number"
    })
    wholeDb.tableDefinition[pageNum].NextColumnId = NextColumnId


    let VariableColumns = getVar({
        length: 2,
        name: "Variable columns",
        type: "number"
    })
    wholeDb.tableDefinition[pageNum].__VariableColumns = VariableColumns


    let colCount = getVar({
        length: 2,
        name: "Column Count",
        type: "number",
        show: true
    })
    wholeDb.tableDefinition[pageNum].__colCount = colCount


    let indexCount = getVar({
        length: 4,
        name: "Index Count",
        type: "number"
    })
    wholeDb.tableDefinition[pageNum].indexCount = indexCount

    let RealIndexCount = getVar({
        length: 4,
        name: "Real Index Count",
        type: "number"
    })
    wholeDb.tableDefinition[pageNum].RealIndexCount = RealIndexCount

    let RowPageMapRecord = getVar({
        length: 1,
        name: "Row Page Map record",
        type: "number",
        show: true
    })
    wholeDb.tableDefinition[pageNum].RowPageMapRecord = RowPageMapRecord

    var RowPageMapPage = getVar({
        length: 3,
        name: "Row Page Map Page",
        type: "number",
        show: true
    })
    wholeDb.tableDefinition[pageNum].RowPageMapPage = RowPageMapPage

    let FreeSpacePageMapRecord = getVar({
        length: 1,
        name: "Free Space Page Map Record",
        type: "number",
        show: true
    })
    wholeDb.tableDefinition[pageNum].FreeSpacePageMapRecord = FreeSpacePageMapRecord

    let FreeSpacePageMapPage = getVar({
        length: 3,
        name: "Free Space Page Map Page",
        type: "number",
        show: true
    })
    wholeDb.tableDefinition[pageNum].FreeSpacePageMapPage = FreeSpacePageMapPage

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

    wholeDb.tableDefinition[pageNum].colsInOrder = {}
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
        wholeDb.tableDefinition[pageNum].colsInOrder[x] = columns[x]
    }
    wholeDb.tableDefinition[pageNum].columnNames = columnNames
    wholeDb.tableDefinition[pageNum].fixedColsList = fixedColsList



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
}






// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function getFixedColName(pageNum, varIndex) {
    //zzz
    return    "FIXED_" + wholeDb.tableDefinition[pageNum].colsInOrder[
        wholeDb.tableDefinition[pageNum].fixedColsList[varIndex]
    ].name
}


// -----------------------------------------------------------------------
//
//
//
//
// -----------------------------------------------------------------------
function getColName(pageNum, varIndex) {
    //zzz
    return    ((wholeDb.tableDefinition[pageNum].colsInOrder[varIndex].fixedLength?"FIXED_":"VAR_") + (wholeDb.tableDefinition[pageNum].colsInOrder[varIndex].name)).padEnd(25, ' ')
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
//
//
//
// -----------------------------------------------------------------------
function populateDataForTableDefinedOnPage(pageNum) {

    let tableData           = []                                    // list of rows of data
    let tableDefinitions    = wholeDb.tableDefinition[pageNum]      // table definitions

    //
    // find all the data pages for this table
    //
    for (let dataOffset = 0; dataOffset < tableDefinitions.pages.length; dataOffset++ ) {

        let dataPageNum = tableDefinitions.pages[dataOffset]
        tempoffset = 4096 * dataPageNum

        let DataPageSignature = getVar({
           length:   1,
           name:    "DataPageSignature",
           type:    "number",
           showas:  "hex"
       })

       //
       // for each data page first read the header of the data page
       //
       getVar({ length: 1, name: "Unknown", type: "number"})
       let FreeSpace = getVar({length: 2, name: "Free Space", type: "number"})
       let tdef_pg = getVar({length: 3,name: "tdef_pg",type: "number"})
       let pgr = getVar({length: 1,name: "tdef_pg record",type: "number"})
       let Owner = getVar({length: 4,name: "Unknown",type: "number"})
       let RecordCount = getVar({length: 2,name: "RecordCount",type: "number"})
       let NullFieldBitmapLength = Math.floor((wholeDb.tableDefinition[pageNum].__colCount + 7) / 8)

       //
       // Since we are given the record count for how many records are stored
       // on this data page in "RecordCount" we can go through and find all
       // the record positions on this page since we are given the offsets
       //
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
        }

        //
        // Now that we have all the positions of the records within this data page
        // stored in "offsetList" we can go through all the records
        //
        let NumCols     = Object.keys(wholeDb.tableDefinition[pageNum].colsInOrder).length
        let numFixed    = wholeDb.tableDefinition[pageNum].__colCount - wholeDb.tableDefinition[pageNum].__VariableColumns
        let fixedCount  = 0

        for (let rc = 0;rc < RecordCount; rc ++) {
            tableRecord = {}
            tableData.push(tableRecord)

            if (offsetList[rc].valid) {
                tempoffset = offsetList[rc].start
                let NumCols = getVar({ length: 2, name: "NumCols", type: "number" })
                for (let yy=0;yy < wholeDb.tableDefinition[pageNum].__colCount; yy++){
                    if (wholeDb.tableDefinition[pageNum].colsInOrder[yy].fixedLength) {
                        let colVal = getVar({
                           length: wholeDb.tableDefinition[pageNum].colsInOrder[yy].length,
                           name: wholeDb.tableDefinition[pageNum].colsInOrder[yy].name,
                           type: "number"
                        })
                    }
                }

                let NullFieldBitmapLength = Math.floor((wholeDb.tableDefinition[pageNum].__colCount + 7) / 8)

                tempoffset = offsetList[rc].end - NullFieldBitmapLength + 1

                let FieldMask = getVar({
                   length: NullFieldBitmapLength,
                   name: "FieldMask",
                   type: "number"
                })

                let maskedFields = {}
                for (let recIndex = 0 ; recIndex < wholeDb.tableDefinition[pageNum].__colCount; recIndex++) {
                    let maskBit = Math.pow(2, recIndex)
                    if (FieldMask & maskBit) {
                        maskedFields[getColName(pageNum,recIndex)] = "***********"
                    } else {
                        maskedFields[getColName(pageNum,recIndex)] = ""
                    }
                }
                tableRecord._mask = maskedFields

                tempoffset = offsetList[rc].end - NullFieldBitmapLength - 1
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
                        listOfOffsets.push({relative_offset: VariableLengthFieldOffset,start: offsetList[rc].start + VariableLengthFieldOffset})
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
                    if (listOfOffsets[varIndex].length  == 2) {
                        let VariableLengthFieldOffset = getVar({length: listOfOffsets[varIndex].length ,name: "VariableLengthFieldOffset",type:"number"})
                        tableRecord[getFixedColName(pageNum, varIndex)] = VariableLengthFieldOffset

                    } else {
                        let VariableLengthFieldOffset = getVar({length: listOfOffsets[varIndex].length ,name: "VariableLengthFieldOffset"})
                        tableRecord[getFixedColName(pageNum, varIndex)] = toUTF8Array(VariableLengthFieldOffset)
                    }
                }
            }
        }
    }
    wholeDb.tableDefinition[pageNum].data = {}

    wholeDb.tableDefinition[pageNum].data = tableData
}









}
