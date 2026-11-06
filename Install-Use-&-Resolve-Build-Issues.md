# Install the library & Use in your project

Install the library `npm i @devcrish/headwind`.

It is recommended to use `vite` as your build tool.

### 1. The Page might show blank when you build the project and host your dist folder

#### The Reason: 
Your page is blank is because your build process is looking for files using absolute paths (like /assets/index.js) from the root of a server, but python -m http.server serves files from the folder you run it in. If your built application expects to be at the absolute root and the browser tries to resolve /assets/..., it fails to find the files, resulting in a blank page with console errors.
You can verify this right away by opening the blank page in your browser, pressing F12 to open the Developer Tools, and checking the Console tab. You will likely see 404 Not Found errors for your JavaScript and CSS files.

#### Solution: 
If your project uses vite Add the `base: './'` property to the vite.config.js
```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // <-- Add this line to enforce relative asset paths
})

```

### 2. Open the console of your webpage, if you See this error `Uncaught TypeError: Cannot read properties of null (reading 'useContext')`. This error is the production version of the "Duplicate React / Invalid Hook Call" issue. 

#### The Reason:
When you run npm run dev, Vite manages the imports dynamically and successfully maps React. But when you run npm run build, your bundler bundles two separate versions of React into your production code: one from your project and one from your local react-ui-library folder. Because React hooks require a single global context instance, having two separate copies of React breaks useContext, resulting in a blank page.
To fix this completely so that your production build works, you must tell your tools to treat React as an external dependency that shouldn't be bundled inside your library, and configure your project to resolve React cleanly.


#### Add an Alias to your project (Fallback Solution)

If you still see the error after rebuilding the library, your project's bundler is still struggling to reconcile the local file path symlink. You can force your project to resolve all copies of React to its own local folder.
If your project uses Vite, open its vite.config.js and add an alias:
Add `"import path from 'path'"` in vite.config.js
```
// Inside your project's vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Forces your project and any linked libraries to use the exact same React instance
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
})
```

Final Test Steps:

1. Re-run npm run build inside your library folder.
2. Re-run npm run build inside your project folder.
3. Serve the dist folder as your webpage
