import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { WEEKDAYS, getMonthGrid, getTodayString } from './calendar.utils';

const MonthView = ({
  currentDate,
  selectedDateStr,
  onDateSelect,
  eventsByDate = {},
  renderCellContent,
}) => {
  const todayStr = useMemo(() => getTodayString(), []);
  const days = useMemo(() => getMonthGrid(currentDate), [currentDate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* 7-Column Weekday Headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: { xs: 0.5, sm: 1 },
          mb: 1,
          textAlign: 'center',
        }}
      >
        {WEEKDAYS.map((d) => (
          <Box key={d.full} sx={{ py: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#64748B',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: { xs: '0.65rem', sm: '0.72rem' },
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {d.short}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#64748B',
                fontSize: '0.7rem',
                display: { xs: 'block', sm: 'none' },
              }}
            >
              {d.letter}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* 7-Column Date Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: { xs: 0.5, sm: 1 },
          flexGrow: 1,
        }}
      >
        {days.map((day) => {
          const isSelected = day.dateStr === selectedDateStr;
          const isToday = day.dateStr === todayStr;
          const dayEvents = eventsByDate[day.dateStr] || [];

          // Status indicators if present in events
          const hasApproved = dayEvents.some((e) => e.status === 'approved');
          const hasPending = dayEvents.some((e) => e.status === 'pending');
          const hasRejected = dayEvents.some((e) => e.status === 'rejected');

          let cellBg = day.isCurrentMonth ? '#FFFFFF' : '#FAFAFA';
          let cellBorder = '#F1F5F9';

          if (hasApproved) {
            cellBg = '#F0FDF4';
            cellBorder = '#DCFCE7';
          } else if (hasPending) {
            cellBg = '#FFFBEB';
            cellBorder = '#FEF3C7';
          } else if (hasRejected) {
            cellBg = '#FEF2F2';
            cellBorder = '#FEE2E2';
          }

          if (isSelected) {
            cellBg = '#F0F9FF';
            cellBorder = '#0284C7';
          }

          return (
            <Box
              key={day.dateStr}
              role="button"
              tabIndex={0}
              aria-label={`${day.dateStr}${isToday ? ' (Today)' : ''}${isSelected ? ' (Selected)' : ''}`}
              onClick={() => onDateSelect?.(day.dateStr, day.date)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDateSelect?.(day.dateStr, day.date);
                }
              }}
              sx={{
                minHeight: { xs: 56, sm: 76, md: 88 },
                p: { xs: 0.6, sm: 1 },
                borderRadius: '10px',
                cursor: 'pointer',
                border: isSelected ? '2px solid #0284C7' : `1px solid ${cellBorder}`,
                backgroundColor: cellBg,
                opacity: day.isCurrentMonth ? 1 : 0.4,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 120ms ease',
                boxSizing: 'border-box',
                outline: 'none',
                '&:hover': {
                  backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
                  borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                },
                '&:focus-visible': {
                  ring: '2px solid #0284C7',
                  borderColor: '#0284C7',
                },
              }}
            >
              {/* Date Header: Number + Today indicator */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isToday || isSelected ? 800 : day.isCurrentMonth ? 600 : 400,
                    color: isSelected
                      ? '#0284C7'
                      : isToday
                      ? '#0284C7'
                      : day.isCurrentMonth
                      ? '#0F172A'
                      : '#94A3B8',
                    fontSize: { xs: '0.72rem', sm: '0.82rem' },
                    width: isToday ? 22 : 'auto',
                    height: isToday ? 22 : 'auto',
                    display: isToday ? 'flex' : 'inline',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: isToday ? '50%' : 'none',
                    backgroundColor: isToday ? '#E0F2FE' : 'transparent',
                  }}
                >
                  {day.dayNum}
                </Typography>

                {isToday && !isSelected && (
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#0284C7',
                    }}
                  />
                )}
              </Box>

              {/* Event Area / Custom Renderer Slot */}
              {renderCellContent ? (
                renderCellContent(day, dayEvents)
              ) : (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 12,
                    pb: 0.25,
                  }}
                >
                  {hasApproved && (
                    <Tooltip title="Approved">
                      <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                    </Tooltip>
                  )}
                  {hasPending && (
                    <Tooltip title="Pending">
                      <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', backgroundColor: '#D97706' }} />
                    </Tooltip>
                  )}
                  {hasRejected && (
                    <Tooltip title="Rejected">
                      <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', backgroundColor: '#DC2626' }} />
                    </Tooltip>
                  )}
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MonthView;
