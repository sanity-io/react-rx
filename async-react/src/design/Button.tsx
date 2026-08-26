import {useTransition, type MouseEvent, type ReactNode} from 'react'

import {Button as ShaButton} from '@/components/ui/button'
import {Spinner} from '@/components/ui/spinner'

export default function Button({
  children,
  action,
}: {
  children: ReactNode
  action: () => Promise<void>
}) {
  const [isPending, transition] = useTransition()

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    transition(async () => {
      await action()
    })
  }
  return <ShaButton onClick={handleClick}>{isPending ? <Spinner /> : children}</ShaButton>
}
