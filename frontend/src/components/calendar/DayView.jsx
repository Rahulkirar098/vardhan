import { Box, Stack, Typography } from '@mui/material';
import { EventNoteRounded, ScheduleRounded } from '@mui/icons-material';
import { formatDayFull } from './calendar.utils';

const DayView = ({
  currentDate,
  selectedDateStr,
  eventsByDate = {},
  renderEventItem,
}) => {
  const activeDate = currentDate || new Date();
  const dateKey = selectedDateStr;
  const dayEvents = eventsByDate[dateKey] || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, minHeight: 380 }}>
      {/* Day Header Banner */}
      <Box
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: '12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <EventNoteRounded sx={{ color: '#0284C7', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }} noWrap>
              {formatDayFull(activeDate)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }} noWrap>
              {dayEvents.length === 0
                ? 'No scheduled events or requests for this day.'
                : `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'} recorded.`}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Events / Timeline List */}
      <Box sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
        {dayEvents.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px dashed #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 240,
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <ScheduleRounded sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B' }}>
              No entries or requests for this date
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5 }}>
              Approved leaves and daily logs for this date will appear here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
            {dayEvents.map((evt, idx) =>
              renderEventItem ? (
                renderEventItem(evt, idx)
              ) : (
                <Box
                  key={evt._id || evt.id || idx}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <Box sx={{ minWidth: 0, mr: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }} noWrap>
                      {evt.appliedBy?.name || evt.title || 'Leave Event'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }} noWrap>
                      {evt.leaveType || evt.subtitle || 'Scheduled Record'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '8px',
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
                      flexShrink: 0,
                    }}
                  >
                    {evt.status || 'Active'}
                  </Box>
                </Box>
              )
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default DayView;
