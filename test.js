
const {table} = require('table');



var noaccess = require("./index.js");

//let rtv = noaccess.load("../Downloads/Database11.accdb")



//console.log(JSON.stringify(rtv,null,2))

function showPageNo(usePage)
{
    let rtv = noaccess.load({
        fileName:   "./a.accdb",
        usePage:     usePage
    })
    let rtv2 = []
    let colNames = Object.keys(rtv.table_pages[usePage].columnNames)
    rtv2.push(colNames)
    for (let row=0; row < rtv.table_pages[usePage].data.length; row++) {
        let rowData = rtv.table_pages[usePage].data[row].data
        let outputCols = []
        //console.log(JSON.stringify(row,null,2))

        for (let OutIn=0;OutIn<colNames.length;OutIn++) {
            let colName = colNames[OutIn]
            //console.log(JSON.stringify(colName,null,2))
            //console.log(JSON.stringify(rowData,null,2))
            let rowDataItem = rowData[colName]
            if (rowData) {
                rowDataItem = JSON.stringify(rowDataItem,null,2)
                try {
                    rowDataItem = rowDataItem.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                } catch(err ){
                    rowDataItem =  "."//err
                }


                outputCols.push(rowDataItem)
            } else {
                outputCols.push("null")
            }

        }
        rtv2.push(outputCols)

        console.log(table(rtv2))
    }

}



if (process.argv[2]) {
    showPageNo(process.argv[2])

} else {
    showPageNo(2)

}
