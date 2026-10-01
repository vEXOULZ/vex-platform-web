import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createPlatformUi } from '../src/vue'
import '../src/style.css'
import './stories.css'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(
    createPlatformUi({
      appName: 'stories',
      jobHref: (id) => `#job-${id}`,
      subjectHref: (s) => `#${s.replace(":", "-")}`,
      notify: (msg, kind) => console.info(`[${kind}] ${msg}`),
    }),
  )
})
