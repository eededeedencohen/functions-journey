// Text with inline math: "הקצב הוא $−3$" renders the math left-to-right inside Hebrew text.
// **bold** and line breaks are supported too, and math may appear inside bold.
function render(text, bold) {
  const parts = String(text).split(bold ? /(\$[^$]+\$|\n)/g : /(\*\*.+?\*\*|\$[^$]+\$|\n)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p === '\n') return <br key={i} />;
    if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{render(p.slice(2, -2), true)}</strong>;
    if (p.length > 2 && p[0] === '$' && p[p.length - 1] === '$')
      return (
        <span key={i} className="m" dir="ltr">
          {p.slice(1, -1)}
        </span>
      );
    // never show leftover markup characters on screen
    return p.replace(/\*\*|\$/g, '');
  });
}

export default function Rich({ text, as: Tag = 'span', className }) {
  if (text == null) return null;
  return <Tag className={className}>{render(text, false)}</Tag>;
}
