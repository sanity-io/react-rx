import Sandpack from '@/components/Sandpack'
import {type ExampleManifest, exampleManifests, type ExampleName} from '@/examples/manifests'
import {getExampleFiles} from '@/utils/exampleFiles'
import {readReactRxDist} from '@/utils/readExample'

export default function ExampleSandpack({example}: {example: ExampleName}) {
  const {dependencies}: ExampleManifest = exampleManifests[example]
  return (
    <Sandpack
      files={getExampleFiles(example)}
      dependencies={dependencies}
      reactRxSource={readReactRxDist()}
    />
  )
}
