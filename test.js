
var noaccess = require("./index.js");

//let rtv = noaccess.load("../Downloads/Database11.accdb")
let rtv = noaccess.load("./a.accdb")

console.log(JSON.stringify(rtv,null,2))
