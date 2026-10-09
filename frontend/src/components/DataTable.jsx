import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
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

const StyledTableContainer = styled(TableContainer)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  const sizing = theme.custom?.sizing || {};
  return {
    width: '100%',
    maxWidth: '100%',
    border: `1px solid ${colors.border || '#E2E8F0'}`,
    borderRadius: theme.shape.borderRadius || 10,
    backgroundColor: colors.background || '#FFFFFF',
    overflowX: 'auto',
    overflowY: 'hidden',
    boxShadow: sizing.shadows?.card || '0 1px 3px rgba(2, 6, 24, 0.04)',
    WebkitOverflowScrolling: 'touch',
  };
});

const StyledHeadCell = styled(TableCell)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  const typography = theme.custom?.typography || {};
  return {
    backgroundColor: colors.sidebar || '#F8FAFC',
    color: colors.mutedForeground || '#62748E',
    fontSize: typography.fontSize?.tableHeader || '0.6875rem', // 11px
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${colors.border || '#E2E8F0'}`,
    padding: '10px 18px',
    whiteSpace: 'nowrap',
  };
});

const StyledBodyCell = styled(TableCell)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    borderBottom: `1px solid ${colors.borderSoft || '#F1F5F9'}`,
    padding: '12px 18px',
    fontSize: '0.875rem', // 14px
    color: colors.foreground || '#020618',
  };
});

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
      <StyledTableContainer>
        <Loading label="Loading…" height="auto" />
      </StyledTableContainer>
    );
  }

  if (!rows.length) {
    return (
      <StyledTableContainer>
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </StyledTableContainer>
    );
  }

  const calculatedMinWidth = Math.max(700, (columns.length + (renderActions ? 1 : 0)) * 130);
  const effectiveMinWidth = minWidth || calculatedMinWidth;

  return (
    <StyledTableContainer>
      <Table sx={{ minWidth: effectiveMinWidth, width: '100%', tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <StyledHeadCell
                key={column.key}
                align={column.align || 'left'}
                sx={{
                  width: column.width,
                  minWidth: column.minWidth || (column.key === 'employee' || column.key === 'name' ? 180 : undefined),
                  maxWidth: column.maxWidth,
                }}
              >
                {column.label}
              </StyledHeadCell>
            ))}
            {renderActions && (
              <StyledHeadCell
                align="right"
                sx={{
                  width: 120,
                  minWidth: 100,
                }}
              >
                Actions
              </StyledHeadCell>
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
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:last-of-type td': {
                    borderBottom: 'none',
                  },
                }}
              >
                {columns.map((column) => (
                  <StyledBodyCell
                    key={column.key}
                    align={column.align || 'left'}
                    sx={{
                      width: column.width,
                      minWidth: column.minWidth || (column.key === 'employee' || column.key === 'name' ? 180 : undefined),
                      maxWidth: column.maxWidth,
                      whiteSpace: column.whiteSpace || (column.key === 'employee' ? 'normal' : 'nowrap'),
                    }}
                  >
                    <CellValue row={row} column={column} renderCell={renderCell} />
                  </StyledBodyCell>
                ))}
                {renderActions && (
                  <StyledBodyCell
                    align="right"
                    sx={{
                      whiteSpace: 'nowrap',
                      minWidth: 100,
                    }}
                  >
                    {renderActions(row)}
                  </StyledBodyCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
};

export default DataTable;