
const {table} = require('table');



var noaccess = require("./index.js");


let ret = noaccess.load({
        fileName:   "./a.accdb"
    })

console.log(ret)
