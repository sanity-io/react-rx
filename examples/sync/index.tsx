const fs = require('fs')
import {SyncExample} from './SyncExample'

export default {
  component: SyncExample,
  title: 'Sync',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/SyncExample.tsx`, 'utf-8'),
}
