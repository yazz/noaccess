
const {table} = require('table');



var noaccess = require("./index.js");

//let rtv = noaccess.load("../Downloads/Database11.accdb")



//console.log(JSON.stringify(rtv,null,2))

function showPageNo(usePage)
{
    let ret = noaccess.load({
            fileName:   "./a.accdb",
            usePage:     usePage,
            showTable:   true
        })

    console.log(ret)
}

function getRawData(usePage)
{
    let ret = noaccess.load({
            fileName:   "./a.accdb",
            usePage:     usePage
        })

    console.log(ret)
}




if (process.argv[2]) {
    getRawData(process.argv[2])

} else {
    getRawData(2)

}
