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
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {rows.map((row, index) => {
          const rowKey = getRowKey ? getRowKey(row, index) : index;

          return (
            <Box
              key={rowKey}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                border: '1px solid #E5E5E5',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                p: 2,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              <Stack spacing={1.25}>
                {columns.map((column) => (
                  <Stack
                    key={column.key}
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, pt: 0.25 }}>
                      {column.label}
                    </Typography>
                    <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                      <CellValue row={row} column={column} renderCell={renderCell} />
                    </Box>
                  </Stack>
                ))}

                {renderActions && (
                  <Box sx={{ pt: 1.25, borderTop: '1px solid #F0F0F0' }}>{renderActions(row)}</Box>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  }

  return (
    <TableContainer
      sx={{
        border: '1px solid #E5E5E5',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'left'}
                sx={{ width: column.width, whiteSpace: 'nowrap' }}
              >
                {column.label}
              </TableCell>
            ))}
            {renderActions && (
              <TableCell align="right" sx={{ width: 120 }}>
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
                  <TableCell key={column.key} align={column.align || 'left'}>
                    <CellValue row={row} column={column} renderCell={renderCell} />
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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