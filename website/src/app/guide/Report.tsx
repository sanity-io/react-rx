'use client'

import {useEffect} from 'react'

export default function Report({mdx}: {mdx: string}) {
  useEffect(() => {
    console.log('mdx:', mdx)
  }, [mdx])

  return <></>
}
