import * as React from "react"
import { Link, graphql } from "gatsby"

import Bio from "../components/bio"
import Layout from "../components/layout"
import Seo from "../components/seo"
import TagView from "../components/tag"

const getTags = posts => {
  const tSet = new Set()
  posts.forEach(p => {
    if (!p.frontmatter.tags) {
      return
    }
    let tag = p.frontmatter.tags
    if (tag.includes(",")) {
      tag.split(",").forEach(t => tSet.add(t.trim()))
    } else {
      tSet.add(tag)
    }
  })
  return Array.from(tSet)
}

const BlogIndex = ({ data, location }) => {
  const [selectTags, setSelectTags] = React.useState([])
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const posts = data.allMarkdownRemark.nodes

  const allTags = getTags(posts)

  const onClickTag = React.useCallback(t => {
    setSelectTags(prev => {
      if (prev.includes(t)) return prev.filter(p => p !== t)
      return [...prev, t]
    })
  }, [])

  React.useEffect(() => setSelectTags(allTags), [posts])

  if (posts.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <Seo title="All posts" />
        <Bio />
        <p>
          No blog posts found. Add markdown posts to "content/blog" (or the
          directory you specified for the "gatsby-source-filesystem" plugin in
          gatsby-config.js).
        </p>
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      <Seo title="All posts" />
      <Bio />
      <div>
        {allTags.map((t, index) => (
          <TagView
            key={t}
            tag={t}
            index={index}
            onClick={() => onClickTag(t)}
            selected={selectTags.includes(t)}
          />
        ))}
      </div>
      <ol style={{ listStyle: `none` }}>
        {posts.map(post => {
          const title = post.frontmatter.title || post.fields.slug

          return (
            <li key={post.fields.slug}>
              <article
                className="post-list-item"
                itemScope
                itemType="http://schema.org/Article"
              >
                <header>
                  <h2>
                    <Link to={post.fields.slug} itemProp="url">
                      <span itemProp="headline">{title}</span>
                    </Link>
                  </h2>
                  <small>{post.frontmatter.date}</small>
                </header>
                <section>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: post.frontmatter.description || post.excerpt,
                    }}
                    itemProp="description"
                  />
                </section>
              </article>
            </li>
          )
        })}
      </ol>
    </Layout>
  )
}

export default BlogIndex

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      nodes {
        excerpt
        fields {
          slug
        }
        frontmatter {
          date(formatString: "MMMM DD, YYYY")
          title
          description
          tags
        }
      }
    }
  }
`
