"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/array-flatten@3.0.0";
exports.ids = ["vendor-chunks/array-flatten@3.0.0"];
exports.modules = {

/***/ "(ssr)/./node_modules/.pnpm/array-flatten@3.0.0/node_modules/array-flatten/dist.es2015/index.js":
/*!************************************************************************************************!*\
  !*** ./node_modules/.pnpm/array-flatten@3.0.0/node_modules/array-flatten/dist.es2015/index.js ***!
  \************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   flatten: () => (/* binding */ flatten)\n/* harmony export */ });\n/**\n * Flatten an array indefinitely.\n */\nfunction flatten(array) {\n    var result = [];\n    $flatten(array, result);\n    return result;\n}\n/**\n * Internal flatten function recursively passes `result`.\n */\nfunction $flatten(array, result) {\n    for (var i = 0; i < array.length; i++) {\n        var value = array[i];\n        if (Array.isArray(value)) {\n            $flatten(value, result);\n        }\n        else {\n            result.push(value);\n        }\n    }\n}\n//# sourceMappingURL=index.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvLnBucG0vYXJyYXktZmxhdHRlbkAzLjAuMC9ub2RlX21vZHVsZXMvYXJyYXktZmxhdHRlbi9kaXN0LmVzMjAxNS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLGtCQUFrQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL21pbGFuL0Rvd25sb2Fkcy93bS93b3JsZHNjb3JlL25vZGVfbW9kdWxlcy8ucG5wbS9hcnJheS1mbGF0dGVuQDMuMC4wL25vZGVfbW9kdWxlcy9hcnJheS1mbGF0dGVuL2Rpc3QuZXMyMDE1L2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRmxhdHRlbiBhbiBhcnJheSBpbmRlZmluaXRlbHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuKGFycmF5KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICRmbGF0dGVuKGFycmF5LCByZXN1bHQpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG4vKipcbiAqIEludGVybmFsIGZsYXR0ZW4gZnVuY3Rpb24gcmVjdXJzaXZlbHkgcGFzc2VzIGByZXN1bHRgLlxuICovXG5mdW5jdGlvbiAkZmxhdHRlbihhcnJheSwgcmVzdWx0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAkZmxhdHRlbih2YWx1ZSwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/.pnpm/array-flatten@3.0.0/node_modules/array-flatten/dist.es2015/index.js\n");

/***/ })

};
;