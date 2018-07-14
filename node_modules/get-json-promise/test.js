var jsonPromise = require('./index');

var url = 'http://localhost:8080/node_modules/@mohayonao/wave-tables/Bass.json';

jsonPromise(url).then(function(data) {
    console.log(data);
});
