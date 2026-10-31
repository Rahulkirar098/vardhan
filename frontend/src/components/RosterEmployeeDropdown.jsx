import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CheckRounded,
  CloseRounded,
  KeyboardArrowDownRounded,
  NavigateBeforeRounded,
  NavigateNextRounded,
  PersonOutlineRounded,
  PhoneOutlined,
  SearchRounded,
} from "@mui/icons-material";
import employeeService from "../services/employee.service";
import InitialsAvatar from "./InitialsAvatar";

/**
 * RosterEmployeeDropdown
 *
 * Paginated dropdown for selecting active, roster-eligible employees.
 * - 10 employees per page with Previous and Next controls inside dropdown.
 * - Server-side search working across the entire employee dataset.
 * - Selection preservation across pagination and search changes.
 * - Fixed maximum height with internal scrolling and sticky footer controls.
 */
export default function RosterEmployeeDropdown({
  value,
  onChange,
  selectedEmployee: initialSelectedEmployee = null,
  onSelectEmployee,
  disabled = false,
  error = false,
  helperText,
  required = true,
  label = "Select Employee / Nurse",
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const limit = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Data States
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Selected Employee representation
  const [selectedEmp, setSelectedEmp] = useState(initialSelectedEmployee);

  // Keep selectedEmp updated if prop changes
  useEffect(() => {
    if (initialSelectedEmployee) {
      setSelectedEmp(initialSelectedEmployee);
    }
  }, [initialSelectedEmployee]);

  // If value is set but selectedEmp details are missing, resolve from list or API
  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setSelectedEmp(null);
      return;
    }

    if (selectedEmp && String(selectedEmp._id) === String(value)) {
      return;
    }

    // Check currently loaded employees
    const found = employees.find((e) => String(e._id) === String(value));
    if (found) {
      setSelectedEmp(found);
      return;
    }

    // Fetch employee details from API
    employeeService
      .getEmployee(value)
      .then((res) => {
        if (!isMounted) return;
        const emp = res?.data?.data || res?.data;
        if (emp) setSelectedEmp(emp);
      })
      .catch((err) => {
        console.warn("Could not load employee details for ID:", value, err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, employees, selectedEmp]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 whenever search query changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // Fetch paginated employees from backend
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await employeeService.listEmployees({
        status: "ACTIVE",
        rosterEligible: true,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      });

      const data = res?.data?.data || res?.data || {};
      const list = Array.isArray(data.employees)
        ? data.employees
        : Array.isArray(data)
        ? data
        : [];

      setEmployees(list);
      setTotal(typeof data.total === "number" ? data.total : list.length);
      setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
    } catch (err) {
      console.error("Failed to fetch roster employees:", err);
      setFetchError("Unable to load employees. Please try again.");
      setEmployees([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  // Trigger fetch when dropdown is open or search/page changes
  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open, fetchEmployees]);

  // Also prefetch page 1 once on mount if empty
  useEffect(() => {
    let isMounted = true;
    if (employees.length === 0) {
      employeeService
        .listEmployees({ status: "ACTIVE", rosterEligible: true, page: 1, limit })
        .then((res) => {
          if (!isMounted) return;
          const data = res?.data?.data || res?.data || {};
          const list = Array.isArray(data.employees) ? data.employees : [];
          setEmployees(list);
          setTotal(typeof data.total === "number" ? data.total : list.length);
          setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenDropdown = () => {
    if (disabled) return;
    setOpen(true);
  };

  const handleCloseDropdown = () => {
    setOpen(false);
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    if (onChange) {
      onChange(emp._id, emp);
    }
    if (onSelectEmployee) {
      onSelectEmployee(emp);
    }
    setOpen(false);
  };

  const handlePrevPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (page > 1 && !loading) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (page < totalPages && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  // Result count formatting
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = total === 0 ? 0 : Math.min(page * limit, total);
  const countDisplay =
    total === 0
      ? "Showing 0 of 0 employees"
      : `Showing ${startCount}–${endCount} of ${total} employees`;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Label */}
      {label && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: error ? "error.main" : "text.secondary",
            mb: 0.75,
            display: "block",
            fontSize: "0.8125rem",
          }}
        >
          {label} {required && <span style={{ color: "#DF2225" }}>*</span>}
        </Typography>
      )}

      {/* Trigger Box */}
      <Box
        ref={anchorRef}
        onClick={handleOpenDropdown}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        sx={{
          height: 50,
          borderRadius: "10px",
          border: "1px solid",
          borderColor: open ? "#252525" : error ? "#DF2225" : "#E5E7EB",
          backgroundColor: "#FFFFFF",
          px: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          transition: "all 180ms ease",
          "&:hover": {
            borderColor: disabled ? "#E5E7EB" : "#252525",
          },
          ...(open && {
            boxShadow: "0 0 0 2px rgba(37, 37, 37, 0.08)",
            borderWidth: "1.5px",
          }),
        }}
      >
        {selectedEmp ? (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ minWidth: 0, flexGrow: 1, mr: 1 }}
          >
            <InitialsAvatar
              name={`${selectedEmp.firstName || ""} ${selectedEmp.lastName || ""}`}
              src={selectedEmp.avatarUrl}
              size={28}
              sx={{ bgcolor: "#252525", flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, color: "text.primary", lineHeight: 1.25 }}
              >
                {selectedEmp.firstName} {selectedEmp.lastName}{" "}
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  ({selectedEmp.employeeId || "Staff"})
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: "text.secondary", display: "block", fontSize: "0.75rem" }}
              >
                {selectedEmp.positionId?.name || "Staff"}
                {selectedEmp.phone ? ` • ${selectedEmp.phone}` : ""}
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: "0.875rem" }}
          >
            Select Employee / Nurse
          </Typography>
        )}

        <KeyboardArrowDownRounded
          sx={{
            color: "text.secondary",
            fontSize: 22,
            transition: "transform 200ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </Box>

      {/* Helper text if error */}
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: error ? "error.main" : "text.secondary",
            mt: 0.5,
            display: "block",
            fontSize: "0.75rem",
          }}
        >
          {helperText}
        </Typography>
      )}

      {/* Dropdown Popover */}
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleCloseDropdown}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              width: anchorRef.current ? anchorRef.current.clientWidth : 360,
              maxWidth: "calc(100vw - 32px)",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
              overflow: "hidden",
              mt: 0.5,
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        {/* 1. Sticky Search Bar at Top */}
        <Box
          sx={{
            p: 1.25,
            bgcolor: "#FFFFFF",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name, ID, position, phone..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => handleSearchChange({ target: { value: "" } })}
                    sx={{ p: "3px" }}
                  >
                    <CloseRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                height: 38,
                fontSize: "0.85rem",
                borderRadius: "8px",
                bgcolor: "#F8FAFC",
                "& fieldset": { borderColor: "#E2E8F0" },
                "&:hover fieldset": { borderColor: "#252525" },
                "&.Mui-focused fieldset": {
                  borderColor: "#252525",
                  borderWidth: "1.5px",
                },
              },
            }}
          />
        </Box>

        {/* 2. Scrollable Middle List */}
        <Box
          sx={{
            maxHeight: 250,
            overflowY: "auto",
            minHeight: 120,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {loading ? (
            <Box
              sx={{
                py: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <CircularProgress size={22} sx={{ color: "#252525" }} />
              <Typography variant="caption" color="text.secondary">
                Loading employees...
              </Typography>
            </Box>
          ) : fetchError ? (
            <Box sx={{ py: 3, px: 2, textAlign: "center" }}>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                {fetchError}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "primary.main",
                  cursor: "pointer",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={fetchEmployees}
              >
                Retry
              </Typography>
            </Box>
          ) : employees.length === 0 ? (
            <Box
              sx={{
                py: 4,
                px: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <PersonOutlineRounded
                sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }}
              />
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {searchQuery
                  ? `No employees matching "${searchQuery}"`
                  : "No roster-eligible employees found"}
              </Typography>
            </Box>
          ) : (
            <List disablePadding sx={{ py: 0.5 }}>
              {employees.map((emp) => {
                const isSelected = String(value) === String(emp._id);
                const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                return (
                  <ListItem
                    key={emp._id}
                    button
                    onClick={() => handleSelectEmployee(emp)}
                    sx={{
                      py: 0.875,
                      px: 1.5,
                      cursor: "pointer",
                      bgcolor: isSelected ? "action.selected" : "transparent",
                      borderLeft: isSelected
                        ? "3px solid #252525"
                        : "3px solid transparent",
                      "&:hover": {
                        bgcolor: isSelected ? "action.selected" : "#F8FAFC",
                      },
                      transition: "background-color 100ms ease",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      sx={{ width: "100%", minWidth: 0 }}
                    >
                      <InitialsAvatar
                        name={fullName}
                        src={emp.avatarUrl}
                        size={32}
                        sx={{ bgcolor: "#252525", flexShrink: 0 }}
                      />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: isSelected ? 700 : 600 }}
                          >
                            {fullName}
                          </Typography>
                          <Chip
                            label={emp.employeeId || "Staff"}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              bgcolor: "#F1F5F9",
                            }}
                          />
                          {emp.gender && (
                            <Chip
                              label={emp.gender.toUpperCase()}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 18,
                                fontSize: "0.62rem",
                                borderColor: "#E2E8F0",
                              }}
                            />
                          )}
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mt: 0.25 }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {emp.positionId?.name || "Staff"}
                          </Typography>
                          {emp.phone && (
                            <>
                              <Typography variant="caption" color="text.disabled">
                                •
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={0.25}
                                alignItems="center"
                              >
                                <PhoneOutlined
                                  sx={{ fontSize: 12, color: "text.secondary" }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  noWrap
                                >
                                  {emp.phone}
                                </Typography>
                              </Stack>
                            </>
                          )}
                        </Stack>
                      </Box>
                      {isSelected && (
                        <CheckRounded
                          sx={{
                            fontSize: 18,
                            color: "text.primary",
                            ml: 0.5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Stack>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        {/* 3. Sticky Pagination Controls at Bottom */}
        <Box
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          sx={{
            px: 1.5,
            py: 0.875,
            bgcolor: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          >
            {countDisplay}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.75rem",
                mr: 0.5,
              }}
            >
              Page {page} of {Math.max(1, totalPages)}
            </Typography>
            <IconButton
              size="small"
              disabled={page <= 1 || loading}
              onClick={handlePrevPage}
              title="Previous Page"
              sx={{
                p: "4px",
                border: "1px solid #E2E8F0",
                bgcolor: "#FFFFFF",
                "&:hover": { bgcolor: "#F1F5F9" },
                "&.Mui-disabled": {
                  borderColor: "#F1F5F9",
                  bgcolor: "transparent",
                  color: "text.disabled",
                },
              }}
            >
              <NavigateBeforeRounded fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              disabled={page >= totalPages || loading}
              onClick={handleNextPage}
              title="Next Page"
              sx={{
                p: "4px",
                border: "1px solid #E2E8F0",
                bgcolor: "#FFFFFF",
                "&:hover": { bgcolor: "#F1F5F9" },
                "&.Mui-disabled": {
                  borderColor: "#F1F5F9",
                  bgcolor: "transparent",
                  color: "text.disabled",
                },
              }}
            >
              <NavigateNextRounded fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

