import * as React from 'react'

import {navigate} from '../datastores/location'

export function Link(props: React.ComponentProps<'a'>) {
  const {href, onClick} = props
  const handleClick = React.useCallback(
    (event: any) => {
      if (onClick) {
        onClick(event)
      }
      event.preventDefault()
      if (href) {
        navigate(href)
      }
    },
    [href, onClick],
  )
  return <a {...props} onClick={handleClick} />
}
