const requireDirectory = require('require-directory');

const routes = requireDirectory(module);
let routesArray = [];

Object.keys(routes).forEach(key => {
    routesArray = routesArray.concat(routes[key]);
});

module.exports = routesArray;
