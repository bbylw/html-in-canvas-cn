import { Reveal } from '../lib/useReveal'

export default function SectionHeader({ index, eyebrow, title, lead, id }) {
  return (
    <Reveal as="div" className="section-head" id={id}>
      {index && <div className="sh-index">{index}</div>}
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="title">{title}</h2>
        {lead && <p className="lead" dangerouslySetInnerHTML={{ __html: lead }} />}
      </div>
    </Reveal>
  )
}
