import {useTransition, type MouseEvent, type ReactNode} from 'react'

import {Button} from '@/components/ui/button'

import {IconButtonShimmer} from './ButtonShimmer'

export default function PendingButton({
  action,
  onClick,
  loading,
  children,
}: {
  action?: () => Promise<void> | void
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  loading?: boolean
  children: ReactNode
}) {
  const [_isPending, transition] = useTransition()
  const isPending = action != null ? _isPending : loading

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (action) {
      transition(async () => {
        await action()
      })
    } else if (onClick) {
      onClick(e)
    }
  }

  return (
    <Button
      className="relative overflow-hidden cursor-pointer"
      variant="outline"
      size="icon-lg"
      onClick={handleClick}
    >
      <IconButtonShimmer isPending={isPending}>{children}</IconButtonShimmer>
    </Button>
  )
}
