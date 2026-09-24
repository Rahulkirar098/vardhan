import { Box, Button, ButtonBase, IconButton, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { ChevronLeftRounded, ChevronRightRounded, TodayRounded } from '@mui/icons-material';
import { useState, useMemo, useCallback } from 'react';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayView from './DayView';
import {
  formatDayFull,
  formatMonthYear,
  formatWeekRange,
  getTodayString,
  toDateString,
} from './calendar.utils';

/**
 * UnifiedCalendar Component
 * Reusable calendar foundation supporting Month, Week, and Day views.
 */
const UnifiedCalendar = ({
  events = [],
  initialDate = new Date(),
  initialView = 'month',
  selectedDate: controlledSelectedDate,
  onDateSelect: controlledOnDateSelect,
  view: controlledView,
  onViewChange: controlledOnViewChange,
  renderCellContent,
  renderEventItem,
  showTodayButton = true,
  legend,
  sx = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Internal state when uncontrolled
  const [internalDate, setInternalDate] = useState(() => (initialDate ? new Date(initialDate) : new Date()));
  const [internalView, setInternalView] = useState(initialView || 'month');
  const [internalSelectedDateStr, setInternalSelectedDateStr] = useState(() => getTodayString());

  const activeView = controlledView || internalView;
  const setView = controlledOnViewChange || setInternalView;

  const currentDate = internalDate;
  const selectedDateStr = controlledSelectedDate ? toDateString(controlledSelectedDate) : internalSelectedDateStr;

  // Map events to date strings (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    if (!Array.isArray(events)) return map;

    events.forEach((item) => {
      if (item.status === 'cancelled') return;

      const start = item.startDate ? new Date(item.startDate) : item.date ? new Date(item.date) : null;
      const end = item.endDate ? new Date(item.endDate) : start;

      if (!start || isNaN(start.getTime())) return;

      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = end && !isNaN(end.getTime()) ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : cur;

      while (cur <= endDay) {
        const key = toDateString(cur);
        if (!map[key]) map[key] = [];
        map[key].push(item);
        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;
  }, [events]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setInternalDate((prev) => {
      const next = new Date(prev);
      if (activeView === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else if (activeView === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  }, [activeView]);

  const handleNext = useCallback(() => {
    setInternalDate((prev) => {
      const next = new Date(prev);
      if (activeView === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else if (activeView === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  }, [activeView]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setInternalDate(today);
    const todayStr = getTodayString();
    setInternalSelectedDateStr(todayStr);
    if (controlledOnDateSelect) {
      controlledOnDateSelect(todayStr, today);
    }
  }, [controlledOnDateSelect]);

  const handleDateSelect = useCallback(
    (dateStr, dateObj) => {
      setInternalSelectedDateStr(dateStr);
      setInternalDate(dateObj);
      if (controlledOnDateSelect) {
        controlledOnDateSelect(dateStr, dateObj);
      }
    },
    [controlledOnDateSelect]
  );

  // Dynamic Header Title
  const headerTitle = useMemo(() => {
    if (activeView === 'month') return formatMonthYear(currentDate);
    if (activeView === 'week') return formatWeekRange(currentDate);
    return formatDayFull(currentDate);
  }, [activeView, currentDate]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.75, sm: 2.75 },
        borderRadius: '14px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        ...sx,
      }}
    >
      {/* ─── Main Calendar Header ─────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: { xs: 2, sm: 2.75 },
        }}
      >
        {/* Left: Previous Button + Prominent Month/Date Title */}
        <Stack direction="row" spacing={1.25} alignItems="center">
          <IconButton
            onClick={handlePrev}
            aria-label={
              activeView === 'month' ? 'Previous Month' : activeView === 'week' ? 'Previous Week' : 'Previous Day'
            }
            size="small"
            sx={{
              width: 36,
              height: 36,
              border: '1px solid #E2E8F0',
              borderRadius: '9px',
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              transition: 'all 120ms ease',
              '&:hover': {
                borderColor: '#CBD5E1',
                backgroundColor: '#F8FAFC',
              },
            }}
          >
            <ChevronLeftRounded fontSize="small" />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.05rem', sm: '1.3rem' },
              color: '#0F172A',
              letterSpacing: '-0.02em',
              userSelect: 'none',
            }}
          >
            {headerTitle}
          </Typography>

          {showTodayButton && !isMobile && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<TodayRounded sx={{ fontSize: '1rem !important' }} />}
              onClick={handleToday}
              sx={{
                ml: 1,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                borderRadius: '8px',
                borderColor: '#E2E8F0',
                color: '#334155',
                py: 0.5,
                px: 1.25,
                '&:hover': { borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
              }}
            >
              Today
            </Button>
          )}
        </Stack>

        {/* Right: View Controls (Day / Week / Month) + Next Button */}
        <Stack direction="row" spacing={1.25} alignItems="center">
          {/* Segmented View Controls: Day | Week | Month */}
          <Box
            sx={{
              display: 'inline-flex',
              p: '3px',
              borderRadius: '10px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
            }}
          >
            {[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
            ].map((v) => {
              const isActive = activeView === v.id;
              return (
                <ButtonBase
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-label={`${v.label} view`}
                  sx={{
                    px: { xs: 1.25, sm: 1.75 },
                    py: 0.6,
                    borderRadius: '7px',
                    backgroundColor: isActive ? '#0F172A' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#64748B',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: { xs: '0.75rem', sm: '0.82rem' },
                    transition: 'all 120ms ease',
                    boxShadow: isActive ? '0 1px 3px rgba(15,23,42,0.15)' : 'none',
                    '&:hover': {
                      color: isActive ? '#FFFFFF' : '#0F172A',
                    },
                  }}
                >
                  {v.label}
                </ButtonBase>
              );
            })}
          </Box>

          <IconButton
            onClick={handleNext}
            aria-label={
              activeView === 'month' ? 'Next Month' : activeView === 'week' ? 'Next Week' : 'Next Day'
            }
            size="small"
            sx={{
              width: 36,
              height: 36,
              border: '1px solid #E2E8F0',
              borderRadius: '9px',
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              transition: 'all 120ms ease',
              '&:hover': {
                borderColor: '#CBD5E1',
                backgroundColor: '#F8FAFC',
              },
            }}
          >
            <ChevronRightRounded fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* ─── Active Calendar View Body ───────────────────────────────── */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {activeView === 'month' && (
          <MonthView
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            onDateSelect={handleDateSelect}
            eventsByDate={eventsByDate}
            renderCellContent={renderCellContent}
          />
        )}

        {activeView === 'week' && (
          <WeekView
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            onDateSelect={handleDateSelect}
            eventsByDate={eventsByDate}
            renderEventItem={renderEventItem}
          />
        )}

        {activeView === 'day' && (
          <DayView
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            eventsByDate={eventsByDate}
            renderEventItem={renderEventItem}
          />
        )}
      </Box>

      {/* ─── Optional Custom Legend / Status Footer ─────────────────── */}
      {legend && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
          {legend}
        </Box>
      )}
    </Paper>
  );
};

export default UnifiedCalendar;
