import a from "a";
import b from "b";
import React from "react";

alert(a);
alert(b);

React.cache(() => {
    alert("Hello");
});

export default React.createElement("input", { id: "my-input" });
