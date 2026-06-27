import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Layout from './components/Layout'
import Landing from './routes/Landing'
import DiscoverResults from './routes/DiscoverResults'
import Overview from './routes/Overview'
import ExtensionDetail from './routes/ExtensionDetail'
import './styles/global.css'

/**
 * Boot the VS Code webview API so the dataLoader utility can detect
 * webview context and use GitHub raw URLs instead of relative paths.
 *
 * acquireVsCodeApi() is only available inside a VS Code webview. In
 * browser dev mode it does not exist and this block is a no-op.
 */
declare function acquireVsCodeApi(): unknown;
if (typeof acquireVsCodeApi === 'function') {
  window.vscode = acquireVsCodeApi();
}

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'discover/:username', element: <DiscoverResults /> },
      {
        element: <Layout />,
        children: [
          { path: 'overview', element: <Overview /> },
          { path: 'extension/:extensionId', element: <ExtensionDetail /> },
        ],
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
