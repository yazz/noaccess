
const {table} = require('table');



var noaccess = require("./index.js");


noaccess.load({fileName:   "./a.accdb"})
let ret = noaccess.getTables()

console.log(JSON.stringify(ret,null,2))
