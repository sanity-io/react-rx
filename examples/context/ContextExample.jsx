'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
var React = require('react')
var rxjs_1 = require('rxjs')
var operators_1 = require('rxjs/operators')
var src_1 = require('../../src')
var ThemeContext = React.createContext('light')
var LIGHT = {backgroundColor: '#eee', color: '#333'}
var DARK = {backgroundColor: '#333', color: '#eee'}
var ThemedButton = src_1.reactiveComponent(function(props$) {
  var theme$ = src_1.useObservableContext(ThemeContext)
  return rxjs_1.combineLatest([props$, theme$]).pipe(
    operators_1.map(function(_a) {
      var props = _a[0],
        theme = _a[1]
      return (
        <button onClick={props.onClick} style={theme === 'light' ? LIGHT : DARK}>
          {props.children}
        </button>
      )
    })
  )
})
exports.ContextExample = src_1.reactiveComponent(function() {
  var _a = src_1.createState('light'),
    theme$ = _a[0],
    setTheme = _a[1]
  return theme$.pipe(
    operators_1.map(function(theme) {
      return (
        <>
          <ThemeContext.Provider value={theme}>
            <ThemedButton
              onClick={function() {
                return setTheme(theme === 'light' ? 'dark' : 'light')
              }}
            >
              Toggle
            </ThemedButton>
          </ThemeContext.Provider>
        </>
      )
    })
  )
})
