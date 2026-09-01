import {SearchIcon} from 'lucide-react'
import {startTransition, useOptimistic, type ChangeEvent} from 'react'

import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group'
import {Spinner} from '@/components/ui/spinner'
import {cn} from '@/lib/utils'

import ButtonShimmer from './ButtonShimmer'

export default function SearchInput({
  value,
  changeAction,
}: {
  value: string
  changeAction: (value: string) => void | Promise<void>
}) {
  const [inputValue, setInputValue] = useOptimistic(value)
  const isPending = inputValue !== value
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    startTransition(async () => {
      setInputValue(newValue)
      await changeAction(newValue)
    })
  }

  return (
    <div className="px-8">
      <InputGroup className="relative overflow-hidden">
        <InputGroupInput placeholder="Search..." value={inputValue} onChange={handleChange} />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupAddon
          align="inline-end"
          className={cn('pending', {'isPending long': isPending})}
        >
          <Spinner />
        </InputGroupAddon>
        <ButtonShimmer isPending={isPending} long />
      </InputGroup>
    </div>
  )
}
