import a from "a";
import a2 from "a/a2";
import b from "b";
import React from "react";

alert(a);
alert(a2);
alert(b);

React.cache(() => {
    alert("Hello");
});
