import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EmptyState from './EmptyState';
import Loading from './Loading';

const isNotEmpty = (value) => value !== null && value !== undefined && value !== '';

const MissingValue = ({ column }) => {
  const fallback = column.empty || '—';

  if (typeof fallback === 'string') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {fallback}
      </Typography>
    );
  }

  return fallback;
};

const CellValue = ({ row, column, renderCell }) => {
  if (renderCell) {
    return renderCell(row, column);
  }

  const value = row?.[column.key];

  if (!isNotEmpty(value)) {
    return <MissingValue column={column} />;
  }

  return String(value);
};

const DataTable = ({
  columns,
  rows = [],
  getRowKey,
  renderCell,
  renderActions,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  loading = false,
  onRowClick,
  minWidth,
}) => {
  if (loading) {
    return (
      <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
        <Loading label="Loading…" height="auto" />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </Box>
    );
  }

  const calculatedMinWidth = Math.max(700, (columns.length + (renderActions ? 1 : 0)) * 130);
  const effectiveMinWidth = minWidth || calculatedMinWidth;

  return (
    <TableContainer
      sx={{
        width: '100%',
        maxWidth: '100%',
        border: '1px solid #E5E5E5',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        overflowX: 'auto',
        overflowY: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Table sx={{ minWidth: effectiveMinWidth, width: '100%', tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'left'}
                sx={{
                  width: column.width,
                  minWidth: column.minWidth || (column.key === 'employee' || column.key === 'name' ? 180 : undefined),
                  maxWidth: column.maxWidth,
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  py: 1.5,
                  px: 2,
                }}
              >
                {column.label}
              </TableCell>
            ))}
            {renderActions && (
              <TableCell
                align="right"
                sx={{
                  width: 120,
                  minWidth: 100,
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  py: 1.5,
                  px: 2,
                }}
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const rowKey = getRowKey ? getRowKey(row, index) : index;

            return (
              <TableRow
                key={rowKey}
                hover
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align || 'left'}
                    sx={{
                      width: column.width,
                      minWidth: column.minWidth || (column.key === 'employee' || column.key === 'name' ? 180 : undefined),
                      maxWidth: column.maxWidth,
                      whiteSpace: column.whiteSpace || (column.key === 'employee' ? 'normal' : 'nowrap'),
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <CellValue row={row} column={column} renderCell={renderCell} />
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell
                    align="right"
                    sx={{
                      whiteSpace: 'nowrap',
                      minWidth: 100,
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    {renderActions(row)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;