const a = require("a");
const a2 = require("a/a2");
const b = require("b");
const React = require("react");

alert(a);
alert(a2);
alert(b);

React.cache(() => {
    alert("Hello");
});
