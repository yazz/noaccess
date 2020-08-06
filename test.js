
var noaccess = require("./index.js");

let rtv = noaccess.load("../Downloads/Database11.accdb")

console.log(JSON.stringify(rtv,null,2))
