import type {ComponentProps} from 'react'

import Sandpack from '@/components/Sandpack'
import {readReactRxDist} from '@/utils/readExample'

/**
 * Server wrapper that loads the local react-rx build for Sandpack in development.
 * Example source files should be read with `readExample` and passed as `files`.
 */
export default function ExampleSandpack(
  props: Omit<ComponentProps<typeof Sandpack>, 'reactRxSource'>,
) {
  const reactRxSource = process.env.NODE_ENV === 'development' ? readReactRxDist() : undefined
  return <Sandpack {...props} reactRxSource={reactRxSource} />
}
