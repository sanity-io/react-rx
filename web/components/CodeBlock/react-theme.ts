const react = {
  // char: '#D8DEE9',
  // comment: '#B2B2B2',
  // keyword: '#c5a5c5',
  lineHighlight: '#353b45', // colors.dark + extra lightness
  primitive: '#5a9bcf',
  string: '#8dc891',
  variable: '#d7deea',
  boolean: '#ff8b50',
  punctuation: '#88C6BE',
  tag: '#fc929e',
  function: '#79b6f2',
  className: '#FAC863',
  method: '#6699CC',
  operator: '#fc929e',
}

export const theme = {
  plain: {
    color: '#e7d2ed',
  },
  styles: [
    {
      types: ['prolog', 'comment', 'doctype', 'cdata'],
      style: {
        color: '#B2B2B2',
      },
    },
    {
      types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol'],
      style: {color: '#5a9bcf'},
    },
    {
      types: ['attr-name', 'string', 'char', 'builtin', 'insterted'],
      style: {
        color: '#D8DEE9',
      },
    },
    {
      types: ['operator', 'entity', 'url', 'string', 'variable', 'language-css'],
      style: {
        color: 'hsl(40, 90%, 70%)',
      },
    },
    {
      types: ['deleted'],
      style: {
        color: 'rgb(255, 85, 85)',
      },
    },
    {
      types: ['italic'],
      style: {
        fontStyle: 'italic',
      },
    },
    {
      types: ['important', 'bold'],
      style: {
        fontWeight: 'bold',
      },
    },
    {
      types: ['regex', 'important'],
      style: {
        color: '#e90',
      },
    },
    {
      types: ['atrule', 'attr-value', 'keyword'],
      style: {
        color: '#c5a5c5',
      },
    },
    {
      types: ['punctuation', 'symbol'],
      style: {
        opacity: '0.7',
      },
    },
  ],
}
