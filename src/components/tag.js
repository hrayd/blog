import React from "react"

const TagView = ({ tag, index, onClick, selected }) => {
  const style = selected
    ? tagStyles[index % tagStyles.length]
    : {
        color: "gray",
        background: "white",
        border: "1px dashed lightgray",
      }
  return (
    <div
      className="tag-view"
      style={style}
      onClick={onClick}
      role="button"
      onKeyPress={onClick}
      tabIndex="0"
    >
      {tag}
    </div>
  )
}

export default TagView

const tagStyles = [
  {
    color: "#c41d7f",
    background: "#fff0f6",
    borderColor: "#ffadd2",
  },
  {
    color: "#1d39c4",
    background: "#f0f5ff",
    borderColor: "#adc6ff",
  },
  {
    color: "#08979c",
    background: "#e6fffb",
    borderColor: "#87e8de",
  },
  {
    color: "#531dab",
    background: "#f9f0ff",
    borderColor: "#d3adf7",
  },
  {
    color: "#d48806",
    background: "#fffbe6",
    borderColor: "#ffe58f",
  },
  {
    color: "#cf1322",
    background: "#fff1f0",
    borderColor: "#ffa39e",
  },
  {
    color: "#7cb305",
    background: "#fcffe6",
    borderColor: "#eaff8f",
  },
  {
    color: "#d4380d",
    background: "#fff2e8",
    borderColor: "#ffbb96",
  },
  {
    color: "#096dd9",
    background: "#e6f7ff",
    borderColor: "#91d5ff",
  },
  {
    color: "#d46b08",
    background: "#fff7e6",
    borderColor: "#ffd591",
  },
  {
    color: "#389e0d",
    background: "#f6ffed",
    borderColor: "#b7eb8f",
  },
]
