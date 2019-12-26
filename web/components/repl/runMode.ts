import {Mode} from 'codemirror'

const isElement = (val: any): val is HTMLElement =>
  typeof val.appendChild === 'function'
import CodeMirror from './codemirror-lib'
import {Observable} from 'rxjs'

export function _old_runMode(
  source: string,
  modespec: Mode<any>,
  arg: any,
  options?: {state?: any; tabSize: number}
) {
  const mode: Mode<any> = CodeMirror.getMode(CodeMirror.defaults, modespec)
  let callback: (
    token: string,
    style?: string | null,
    i?: number,
    j?: number,
    state?: any
  ) => void
  if (isElement(arg)) {
    const tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize
    const node = arg
    let col = 0
    node.innerHTML = ''
    callback = function(text: string, style?: string | null) {
      if (text == '\n') {
        node.appendChild(document.createTextNode(text))
        col = 0
        return
      }
      let content = ''
      // replace tabs
      for (let pos = 0; ; ) {
        const idx = text.indexOf('\t', pos)
        if (idx == -1) {
          content += text.slice(pos)
          col += text.length - pos
          break
        } else {
          col += idx - pos
          content += text.slice(pos, idx)
          const size = tabSize - (col % tabSize)
          col += size
          for (let i = 0; i < size; ++i) content += ' '
          pos = idx + 1
        }
      }

      if (style) {
        const sp = node.appendChild(document.createElement('span'))
        sp.className = 'cm-' + style.replace(/ +/g, ' cm-')
        sp.appendChild(document.createTextNode(content))
      } else {
        node.appendChild(document.createTextNode(content))
      }
    }
  } else {
    callback = arg
  }
  const lines = CodeMirror.splitLines(source),
    state = (options && options.state) || CodeMirror.startState(mode)

  for (let i = 0, e = lines.length; i < e; ++i) {
    if (i) callback('\n')
    const stream = new CodeMirror.StringStream(lines[i])
    if (!stream.string && mode.blankLine) mode.blankLine(state)
    while (!stream.eol()) {
      const style = mode.token!(stream, state)
      callback(stream.current(), style, i, stream.start, state)
      stream.start = stream.pos
    }
  }
}

export function runMode(
  source: string,
  modespec: Mode<any>,
  options?: {state?: any; tabSize: number}
) {
  return new Observable(subscriber => {
    const mode: Mode<any> = CodeMirror.getMode(CodeMirror.defaults, modespec)
    const lines = CodeMirror.splitLines(source)
    const state = (options && options.state) || CodeMirror.startState(mode)

    for (let i = 0, e = lines.length; i < e; ++i) {
      const tokens = []
      const stream = new CodeMirror.StringStream(lines[i])
      if (!stream.string && mode.blankLine) mode.blankLine(state)
      while (!stream.eol()) {
        const style = mode.token!(stream, state)
        tokens.push({token: stream.current(), style})
        stream.start = stream.pos
      }
      if (i !== lines.length - 1) {
        tokens.push({token: '\n', style: null})
      }
      subscriber.next(tokens)
    }
    subscriber.complete()
  })
}
