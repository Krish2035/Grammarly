import * as diff from 'diff';

export const DiffViewer = ({ oldText, newText }) => {
  const changes = diff.diffWords(oldText, newText);

  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200 leading-relaxed">
      {changes.map((part, index) => (
        <span
          key={index}
          className={
            part.added ? 'bg-green-100 text-green-700 font-medium px-1 rounded' :
            part.removed ? 'bg-red-100 text-red-700 line-through px-1 rounded' : 
            'text-slate-700'
          }
        >
          {part.value}
        </span>
      ))}
    </div>
  );
};