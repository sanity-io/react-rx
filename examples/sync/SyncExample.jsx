"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var hooks_1 = require("../../hooks");
// this will synchronously set the state before the component mounts, and thereafter
// wait 1 second before starting updating every 500ms
var UPDATE_COUNT = 10;
var Sync1 = hooks_1.streamingComponent(function () {
    return rxjs_1.concat(rxjs_1.of('First render is sync! (waiting…)'), rxjs_1.timer(1000, 500).pipe(operators_1.map(function (n) { return "Update #" + (n + 1) + " of " + UPDATE_COUNT; }), operators_1.take(UPDATE_COUNT)), rxjs_1.of('Completed!'));
});
var Sync2 = function (props) {
    return (<div>Sync 2: {hooks_1.useObservable(hooks_1.stream(props.text).pipe(operators_1.map(function (text) { return text.toUpperCase(); })))}</div>);
};
exports.SyncExample = function () {
    return (<div>
      <Sync1 />
      {hooks_1.useObservable(rxjs_1.timer(0, 100).pipe(operators_1.map(function (n) { return <Sync2 text={"This is a text " + n}/>; })))}
    </div>);
};
