import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "#root/*": path.resolve(__dirname, "./"),
      // per https://github.com/aws-amplify/amplify-js/issues/9639#issuecomment-1081781840
      "./runtimeConfig": "./runtimeConfig.browser",
    },
  },
})
