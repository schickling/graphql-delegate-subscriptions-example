var $$asyncIterator = require('iterall').$$asyncIterator

function Chirper (to) {
  this.to = to
}

Chirper.prototype[$$asyncIterator] = function () {
  return {
    to: this.to,
    num: 0,
    next () {
      return new Promise(function (resolve) {
        if (this.num >= this.to) {
          resolve({ value: undefined, done: true })
        } else {
          setTimeout(function () {
            resolve({ value: this.num++, done: false })
          }, 1000)
        }
      }
    },
  }
}

var chirper = new Chirper(3)
for await (var number of chirper) {
  console.log(number) // 0 ...wait... 1 ...wait... 2
}
