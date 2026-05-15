export const Table = ({ children, className = '' }) => (
  <div className={`overflow-x-auto rounded-card border border-gray-200 ${className}`}>
    <table className="min-w-full divide-y divide-gray-200">{children}</table>
  </div>
);

export const TableHead = ({ children }) => (
  <thead className="bg-gray-50">{children}</thead>
);

export const TableBody = ({ children }) => (
  <tbody className="bg-white divide-y divide-gray-100">{children}</tbody>
);

export const TableRow = ({ children, onClick, className = '' }) => (
  <tr
    onClick={onClick}
    className={`transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${className}`}
  >
    {children}
  </tr>
);

export const TableHeaderCell = ({ children, className = '' }) => (
  <th
    scope="col"
    className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>
);
