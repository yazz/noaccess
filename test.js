
const {table} = require('table');



var noaccess = require("./index.js");


noaccess.load({fileName:   "./a.accdb"})
let ret = noaccess.getTables()



//let tableData = noaccess.getTableData("CustomerT")
//console.log(JSON.stringify(tableData,null,2))

//let tablePages = noaccess.getTablePages()
//console.log("Table pages: " + JSON.stringify(tablePages,null,2))

//console.log(JSON.stringify(ret,null,2))

let cols = noaccess.getColumns("CustomerT")
console.log(JSON.stringify(cols,null,2))
