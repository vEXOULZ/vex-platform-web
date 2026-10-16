import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createPlatformUi } from '../src/vue'
import { parseTwitchUser } from '../src/chat'
import fixture from '../tests/fixtures/twitch-user.json'
import '../src/style.css'
import './stories.css'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(
    createPlatformUi({
      appName: 'stories',
      jobHref: (id) => `#job-${id}`,
      subjectHref: (s) => `#${s.replace(":", "-")}`,
      notify: (msg, kind) => console.info(`[${kind}] ${msg}`),
      // The fixture for `someone`, nobody for anyone else (the card's "no account" note), after a short wait.
      userLookup: (key) =>
        new Promise((resolve) =>
          setTimeout(() => resolve(key.login === 'someone' ? { ...parseTwitchUser(fixture)!, id: '1', login: 'someone', displayName: 'SomeOne' } : null), 400),
        ),
    }),
  )
})
