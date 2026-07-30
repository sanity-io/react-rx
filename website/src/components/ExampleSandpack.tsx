import type {ComponentProps} from 'react'

import Sandpack from '@/components/Sandpack'
import {readReactRxDist} from '@/utils/readExample'

export default function ExampleSandpack(
  props: Omit<ComponentProps<typeof Sandpack>, 'reactRxSource'>,
) {
  const reactRxSource = readReactRxDist()
  return <Sandpack {...props} reactRxSource={reactRxSource} />
}
