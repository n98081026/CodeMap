import React from 'react';

interface SnapLine {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

interface SnapLinesProps {
  snapLines: SnapLine[];
}

const SnapLines: React.FC<SnapLinesProps> = React.memo(({ snapLines }) => {
  if (!snapLines || snapLines.length === 0) {
    return null;
  }

  return (
    <div className='pointer-events-none absolute inset-0 z-10'>
      {snapLines.map((line) => (
        <div
          key={line.id}
          className='absolute bg-blue-500 opacity-60'
          style={{
            ...(line.type === 'horizontal'
              ? {
                  top: line.position,
                  left: line.start,
                  width: line.end - line.start,
                  height: 1,
                }
              : {
                  left: line.position,
                  top: line.start,
                  width: 1,
                  height: line.end - line.start,
                }),
          }}
        />
      ))}
    </div>
  );
});

SnapLines.displayName = 'SnapLines';

export default SnapLines;
