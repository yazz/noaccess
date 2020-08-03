exports.printMsg = function() {
  console.log("This is the MS Access Import npm package");
  return {Z: 1}
}

exports.load = function(fileName) {
    console.log("Load file: " + fileName);
}
