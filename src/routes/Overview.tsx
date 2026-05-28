import { Link } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'

export default function Overview() {
  const extensions = useExtensionsContext()

  return (
    <div>
      <h1>Overview</h1>
      <ul>
        {extensions.map(ext => (
          <li key={ext.id}>
            <Link to={`/extension/${ext.id}`}>{ext.displayName}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
