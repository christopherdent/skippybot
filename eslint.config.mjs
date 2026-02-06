// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Turn off strict formatting rules
    'indent': 'off',
    'vue/html-indent': 'off',
    'prettier/prettier': [
      'warn', // or 'off' to fully disable
      {
        // override formatting rules if needed
        printWidth: 120,
        tabWidth: 2,
        useTabs: false,
        semi: false,
        singleQuote: true
      }
    ]
  }
})
