import * as React from "react"
import { Link } from "gatsby"
import useDarkMode from "use-dark-mode"
import Toggle from "react-toggle"
import "../toggle-style.css"
import { DarkIcon, LightIcon } from "./toggle-icon"

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  const isRootPath = location.pathname === rootPath
  const darkMode = useDarkMode(false)
  let header

  React.useEffect(() => {
    if (window) {
      if (window.localStorage.getItem("darkMode") === "true") {
        darkMode.enable()
      } else {
        darkMode.disable()
      }
    }
  }, [darkMode])

  if (isRootPath) {
    header = (
      <h1 className="main-heading">
        <Link to="/">{title}</Link>
      </h1>
    )
  } else {
    header = (
      <Link className="header-link-home" to="/">
        {title}
      </Link>
    )
  }

  return (
    <div className="global-wrapper" data-is-root-path={isRootPath}>
      <header className="global-header">
        {header}
        <Toggle
          checked={darkMode.value}
          onChange={darkMode.toggle}
          icons={{ checked: <DarkIcon />, unchecked: <LightIcon /> }}
        />
      </header>
      <main>{children}</main>
      <footer>
        <a href="https://www.github.com/hrayd/">github</a>
        {` · `}
        <a href="https://www.zhihu.com/people/artyhacker">zhihu</a>
      </footer>
    </div>
  )
}

export default Layout
