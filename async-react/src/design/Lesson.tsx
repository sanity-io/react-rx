import {Lightbulb, Shuffle, Zap, Hourglass, FastForward, Puzzle} from 'lucide-react'
import type {LucideIcon} from 'lucide-react'
import type {ReactNode} from 'react'

import {ItemGroup} from '@/components/ui/item'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import type {Lesson, LessonIcon} from '@/data/fake-data'

const ICONS: Record<LessonIcon, LucideIcon> = {
  lightbulb: Lightbulb,
  shuffle: Shuffle,
  zap: Zap,
  hourglass: Hourglass,
  fastforward: FastForward,
  puzzle: Puzzle,
}

export function LessonCard({item, children}: {item: Lesson; children: ReactNode}) {
  const Icon = ICONS[item.icon]
  return (
    <Item className="pl-4">
      <ItemMedia className="h-12 w-12">
        <Icon className="size-6" size="34px" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{item.title}</ItemTitle>
        <ItemDescription>{item.description}</ItemDescription>
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  )
}

export function List({children}: {children: ReactNode}) {
  return <ItemGroup className="px-4">{children}</ItemGroup>
}
