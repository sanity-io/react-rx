import './main.css'
import * as React from 'react'

import {App} from '../App'
import {createRoot} from 'react-dom/client'

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
