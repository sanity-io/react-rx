import './main.css'

import * as React from 'react'
import {createRoot} from 'react-dom/client'

import {App} from '../App'

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
