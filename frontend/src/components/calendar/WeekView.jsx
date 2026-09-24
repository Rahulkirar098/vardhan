import { Box, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { getTodayString, getWeekDays } from './calendar.utils';

const WeekView = ({
  currentDate,
  selectedDateStr,
  onDateSelect,
  eventsByDate = {},
  renderEventItem,
}) => {
  const todayStr = useMemo(() => getTodayString(), []);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* 7-Column Day Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(7, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 1 },
          minHeight: 380,
        }}
      >
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDateStr;
          const isToday = day.dateStr === todayStr;
          const dayEvents = eventsByDate[day.dateStr] || [];

          return (
            <Box
              key={day.dateStr}
              onClick={() => onDateSelect?.(day.dateStr, day.date)}
              sx={{
                borderRadius: '12px',
                border: isSelected ? '2px solid #0284C7' : '1px solid #E2E8F0',
                backgroundColor: isSelected ? '#F0F9FF' : isToday ? '#F8FAFC' : '#FFFFFF',
                p: { xs: 1.5, sm: 1.25 },
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 120ms ease',
                cursor: 'pointer',
                minHeight: { xs: 100, sm: 300 },
                '&:hover': {
                  borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                  backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
                },
              }}
            >
              {/* Day Header */}
              <Box
                sx={{
                  pb: 1,
                  mb: 1,
                  borderBottom: '1px solid #F1F5F9',
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: '0.7rem',
                    display: 'block',
                  }}
                >
                  {day.dayNameShort}
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#0284C7' : 'transparent',
                    color: isToday ? '#FFFFFF' : isSelected ? '#0284C7' : '#0F172A',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    mt: 0.25,
                  }}
                >
                  {day.dayNum}
                </Box>
              </Box>

              {/* Event Cards Area for this Day */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {dayEvents.length === 0 ? (
                  <Box
                    sx={{
                      height: '100%',
                      minHeight: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.35,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                      —
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={0.75}>
                    {dayEvents.map((evt, idx) =>
                      renderEventItem ? (
                        renderEventItem(evt, idx)
                      ) : (
                        <Box
                          key={evt._id || evt.id || idx}
                          sx={{
                            p: 0.75,
                            borderRadius: '6px',
                            backgroundColor:
                              evt.status === 'approved'
                                ? '#DCFCE7'
                                : evt.status === 'rejected'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                            color:
                              evt.status === 'approved'
                                ? '#15803D'
                                : evt.status === 'rejected'
                                ? '#B91C1C'
                                : '#B45309',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            lineHeight: 1.2,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, fontSize: '0.72rem', display: 'block' }}
                            noWrap
                          >
                            {evt.appliedBy?.name || evt.title || 'Leave'}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.65rem', opacity: 0.85, display: 'block' }}
                            noWrap
                          >
                            {evt.leaveType || evt.subtitle || evt.status}
                          </Typography>
                        </Box>
                      )
                    )}
                  </Stack>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default WeekView;
