import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
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

const TableWrapper = styled(Box)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  const sizing = theme.custom?.sizing || {};
  return {
    width: '100%',
    maxWidth: '100%',
    border: `1px solid ${colors.border || '#E2E8F0'}`,
    borderRadius: theme.shape.borderRadius || 10,
    backgroundColor: colors.card || '#FFFFFF',
    boxShadow: sizing.shadows?.card || '0 1px 3px rgba(2, 6, 24, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };
});

const StyledTableContainer = styled(TableContainer)({
  width: '100%',
  maxWidth: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
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

const StyledPagination = styled(TablePagination)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    borderTop: `1px solid ${colors.border || '#E2E8F0'}`,
    backgroundColor: colors.card || '#FFFFFF',
    color: colors.mutedForeground || '#62748E',
    overflow: 'visible',
    '& .MuiTablePagination-toolbar': {
      minHeight: 52,
      paddingLeft: 16,
      paddingRight: 16,
    },
    '& .MuiTablePagination-selectLabel': {
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: colors.mutedForeground || '#62748E',
    },
    '& .MuiTablePagination-displayedRows': {
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: colors.mutedForeground || '#62748E',
    },
    '& .MuiTablePagination-select': {
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: colors.foreground || '#020618',
    },
    '& .MuiTablePagination-actions': {
      color: colors.foreground || '#020618',
    },
  };
});

const DataTable = ({
  columns = [],
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
  showSerialNumber = true,
  serialNumberLabel = 'S.No.',
  serialNumberAlign = 'center',
  startIndex,
  renderSerialNumber,
  pagination = true,
  rowsPerPageOptions = [10, 20, 25, 50, 100],
  defaultRowsPerPage = 10,
}) => {
  const isPaginationEnabled = Boolean(pagination);
  const paginationConfig = typeof pagination === 'object' ? pagination : {};
  const isServerPagination = Boolean(
    paginationConfig.server || typeof paginationConfig.onPageChange === 'function'
  );

  const initialRowsPerPage =
    paginationConfig.pageSize || paginationConfig.limit || defaultRowsPerPage;

  const [clientPage, setClientPage] = useState(0);
  const [clientRowsPerPage, setClientRowsPerPage] = useState(initialRowsPerPage);

  // Auto-reset page if filtering/search reduced rows count below current page
  useEffect(() => {
    if (!isServerPagination && clientPage > 0 && clientPage * clientRowsPerPage >= rows.length) {
      setClientPage(0);
    }
  }, [rows.length, clientPage, clientRowsPerPage, isServerPagination]);

  const activePage = isServerPagination
    ? Math.max(0, (paginationConfig.page || 1) - 1)
    : clientPage;

  const activeRowsPerPage = isServerPagination
    ? (paginationConfig.pageSize || paginationConfig.limit || defaultRowsPerPage)
    : clientRowsPerPage;

  const totalCount = isServerPagination
    ? (paginationConfig.total ?? rows.length)
    : rows.length;

  const effectiveRowsPerPageOptions = useMemo(() => {
    const baseOptions = paginationConfig.rowsPerPageOptions || rowsPerPageOptions;
    if (baseOptions.includes(activeRowsPerPage)) {
      return baseOptions;
    }
    return [...baseOptions, activeRowsPerPage].sort((a, b) => a - b);
  }, [paginationConfig.rowsPerPageOptions, rowsPerPageOptions, activeRowsPerPage]);

  const displayedRows = useMemo(() => {
    if (!isPaginationEnabled || isServerPagination) {
      return rows;
    }
    const start = clientPage * clientRowsPerPage;
    return rows.slice(start, start + clientRowsPerPage);
  }, [rows, isPaginationEnabled, isServerPagination, clientPage, clientRowsPerPage]);

  const handlePageChange = (event, newPage) => {
    if (isServerPagination) {
      paginationConfig.onPageChange?.(newPage + 1);
    } else {
      setClientPage(newPage);
    }
  };

  const handleRowsPerPageChange = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    if (isServerPagination) {
      const onRowsChange = paginationConfig.onRowsPerPageChange || paginationConfig.onLimitChange;
      onRowsChange?.(newLimit);
    } else {
      setClientRowsPerPage(newLimit);
      setClientPage(0);
    }
  };

  const baseStartIndex =
    startIndex !== undefined
      ? startIndex
      : isPaginationEnabled
      ? (activePage * activeRowsPerPage) + 1
      : 1;

  if (loading) {
    return (
      <TableWrapper>
        <Loading label="Loading…" height="auto" />
      </TableWrapper>
    );
  }

  if (!rows.length) {
    return (
      <TableWrapper>
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </TableWrapper>
    );
  }

  const calculatedMinWidth = Math.max(
    650,
    (columns.length + (showSerialNumber ? 0.5 : 0) + (renderActions ? 1 : 0)) * 100
  );
  const effectiveMinWidth = minWidth || calculatedMinWidth;

  const shouldRenderPagination =
    isPaginationEnabled &&
    (!paginationConfig.hideOnSinglePage || totalCount > activeRowsPerPage);

  return (
    <TableWrapper>
      <StyledTableContainer>
        <Table sx={{ minWidth: effectiveMinWidth, width: '100%', tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              {showSerialNumber && (
                <StyledHeadCell
                  key="__serial_number__"
                  align={serialNumberAlign}
                  sx={{
                    width: 64,
                    minWidth: 54,
                    maxWidth: 72,
                    px: 1.5,
                    textAlign: serialNumberAlign,
                  }}
                >
                  {serialNumberLabel}
                </StyledHeadCell>
              )}
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
            {displayedRows.map((row, index) => {
              const rowKey = getRowKey ? getRowKey(row, index) : index;

              return (
                <TableRow
                  key={rowKey}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:last-of-type td': {
                      borderBottom: shouldRenderPagination ? undefined : 'none',
                    },
                  }}
                >
                  {showSerialNumber && (
                    <StyledBodyCell
                      key="__serial_number__"
                      align={serialNumberAlign}
                      sx={{
                        width: 64,
                        minWidth: 54,
                        maxWidth: 72,
                        px: 1.5,
                        textAlign: serialNumberAlign,
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {typeof renderSerialNumber === 'function'
                        ? renderSerialNumber(row, index, baseStartIndex + index)
                        : baseStartIndex + index}
                    </StyledBodyCell>
                  )}
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
      {shouldRenderPagination && (
        <StyledPagination
          component="div"
          count={totalCount}
          page={activePage}
          onPageChange={handlePageChange}
          rowsPerPage={activeRowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={effectiveRowsPerPageOptions}
        />
      )}
    </TableWrapper>
  );
};

export default DataTable;