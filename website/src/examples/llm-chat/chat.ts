import {map, scan, shareReplay, type Observable} from 'rxjs'

import {streamCompletion} from './llm'

export interface Chat {
  id: string
  title: string
  prompt: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export const CHATS: Chat[] = [
  {id: 'dinner', title: 'Dinner', prompt: 'Suggest a quick weeknight dinner'},
  {id: 'rxjs', title: 'RxJS', prompt: 'Explain RxJS in one paragraph'},
  {id: 'haiku', title: 'Haiku', prompt: 'Write a haiku about streams'},
]

const conversations = new Map<string, Observable<Message[]>>()

/**
 * The conversation for a chat: the user's prompt followed by the assistant's
 * reply, folded together token by token with `scan`.
 *
 * One stable, shared stream per chat id. `shareReplay` with `refCount: false`
 * keeps the reply streaming even while its chat is hidden or unmounted (the
 * source completes, so nothing leaks), and late subscribers immediately get
 * the latest state.
 */
export function conversation$(chat: Chat): Observable<Message[]> {
  let messages$ = conversations.get(chat.id)
  if (!messages$) {
    messages$ = streamCompletion(chat.prompt).pipe(
      scan((reply, token) => reply + token, ''),
      map((reply) => [
        {role: 'user' as const, content: chat.prompt},
        {role: 'assistant' as const, content: reply},
      ]),
      shareReplay({bufferSize: 1, refCount: false}),
    )
    conversations.set(chat.id, messages$)
  }
  return messages$
}
