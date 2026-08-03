import {useState} from 'react'

import {login, prefetchLessons} from './api'
import {Button, LoginForm} from './design'
import {useRouter} from './router'

const initialFieldData = {
  username: 'hi@react.dev',
  password: 'reactisgoodactually',
}

export default function Login() {
  const router = useRouter()
  const [fields, setFields] = useState(
    initialFieldData,
  )

  async function submitAction() {
    // Inside an Action we know we're in a transition: the button stays
    // pending until the POST, the prefetch, and the navigation are done.
    await login()

    // Warm the lessons stream before navigating, waiting at most 1s. On a
    // fast network the home screen appears fully loaded; on a slow one we
    // navigate after 1s and the Suspense fallback takes over.
    await prefetchLessons()

    router.navigate('/')
  }

  return (
    <LoginForm
      fields={fields}
      setFields={setFields}
    >
      <Button action={submitAction}>Login</Button>
    </LoginForm>
  )
}
