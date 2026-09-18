import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ArrowBackRounded, EditRounded, GroupAddRounded, SwapVertRounded } from '@mui/icons-material';
import departmentService from '../../services/department';
import hrService from '../../services/hr';
import auth from '../../services/auth';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import InfoRow from '../../components/InfoRow';
import InitialsAvatar from '../../components/InitialsAvatar';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorState from '../../components/ErrorState';
import AppLayout from '../../components/AppLayout';
import EditDepartmentModal from './components/EditDepartmentModal';
import InviteHRModal from './components/InviteHRModal';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const { departmentId } = useParams();
  const [department, setDepartment] = useState(null);
  const [hrs, setHrs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [stats, setStats] = useState({ totalHRs: 0, pendingInvitations: 0 });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cancelInvitation, setCancelInvitation] = useState(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await departmentService.getDetails(departmentId);
      const data = response?.data?.data || {};
      setDepartment(data.department || null);
      setHrs(Array.isArray(data.hrs) ? data.hrs : []);
      setInvitations(Array.isArray(data.pendingInvitationRecords) ? data.pendingInvitationRecords : []);
      setStats(data.stats || { totalHRs: 0, pendingInvitations: 0 });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load department details.');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  const handleChangeStatus = async () => {
    if (!department) return;

    const nextStatus = department.status === 'active' ? 'inactive' : 'active';

    try {
      setSubmitting(true);
      await departmentService.updateStatus(department._id, nextStatus);
      setMessage(`Department ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
      await fetchDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update department status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invitationId) => {
    setError('');
    setMessage('');

    try {
      setSubmitting(true);
      const response = await hrService.resendInvitation(invitationId);
      setMessage(response?.data?.message || 'Invitation resent successfully.');
      await fetchDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to resend invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelInvitation) return;

    setError('');
    setMessage('');

    try {
      setSubmitting(true);
      const response = await hrService.cancelInvitation(cancelInvitation._id);
      setCancelInvitation(null);
      setMessage(response?.data?.message || 'Invitation cancelled successfully.');
      await fetchDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to cancel invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeHrs = hrs.filter((hr) => (hr.status || 'active') === 'active').length;

  const hrColumns = [
    {
      key: 'name',
      label: 'HR Team Member',
      renderCell: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <InitialsAvatar name={row.name} size={34} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      renderCell: (row) => <Typography variant="body2">{row.phone || '—'}</Typography>,
    },
    {
      key: 'status',
      label: 'Status',
      renderCell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4}>
        <Box>
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackRounded fontSize="small" />}
            onClick={() => navigate('/departments')}
            sx={{ px: 0, mb: 1.5, color: 'text.secondary' }}
          >
            Back to Departments
          </Button>
          <PageHeader
            title={department?.name || 'Department Details'}
            subtitle={department ? `Manage this department and its HR team · Code ${department.code}` : 'Loading department…'}
            actions={
              loading || !department ? null : (
                <>
                  <Button variant="outlined" startIcon={<SwapVertRounded />} onClick={handleChangeStatus} disabled={submitting}>
                    {department.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="outlined" startIcon={<EditRounded />} onClick={() => setEditOpen(true)} disabled={submitting}>
                    Edit Department
                  </Button>
                  <Button variant="contained" startIcon={<GroupAddRounded />} onClick={() => setInviteOpen(true)} disabled={submitting}>
                    Invite HR
                  </Button>
                </>
              )
            }
          />
        </Box>

        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF', p: 3 }}>
            <Typography color="text.secondary">Loading department…</Typography>
          </Box>
        ) : !department ? (
          <ErrorState message="Department not found." />
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                gap: 2.5,
              }}
            >
              <StatCard label="Total HR" value={stats.totalHRs ?? hrs.length} footer={<StatusBadge status={hrs.length ? 'active' : 'inactive'} label={hrs.length ? 'Assigned' : 'Empty'} />} />
              <StatCard label="Active HR" value={activeHrs} footer={<StatusBadge status="active" label="Working" />} />
              <StatCard
                label="Pending Invitations"
                value={stats.pendingInvitations ?? invitations.length}
                footer={<StatusBadge status={invitations.length ? 'pending' : 'inactive'} label={invitations.length ? 'Awaiting response' : 'None'} />}
              />
            </Box>

            <SectionCard
              title="Department Information"
              action={<StatusBadge status={department.status} />}
            >
              <InfoRow label="Department Name" value={department.name} />
              <InfoRow label="Department Code" value={department.code} />
              <InfoRow label="Description" value={department.description} />
              <InfoRow label="Status" value={formatStatus(department.status)} />
            </SectionCard>

            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                    HR Team
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hrs.length} member{hrs.length === 1 ? '' : 's'} assigned to this department
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<GroupAddRounded />} onClick={() => setInviteOpen(true)}>
                  Invite HR Member
                </Button>
              </Stack>

              <DataTable
                columns={hrColumns}
                rows={hrs}
                getRowKey={(row) => row._id}
                loading={loading}
                emptyTitle="No HR assigned yet"
                emptyDescription="Invite HR members to join this department."
                renderActions={(row) => (
                  <Button size="small" variant="outlined" onClick={() => navigate(`/hr/${row._id}`)}>
                    View Profile
                  </Button>
                )}
              />
            </Stack>

            {invitations.length > 0 && (
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                      Pending Invitations
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Invitations waiting for HR members to accept
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={1.5}>
                  {invitations.map((invitation) => (
                    <Box
                      key={invitation._id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                        border: '1px solid #E5E5E5',
                        borderRadius: '12px',
                        backgroundColor: '#FFFFFF',
                        p: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <InitialsAvatar name={invitation.name} size={36} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }}>{invitation.name}</Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {invitation.email}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25 }}>
                            <StatusBadge status="pending" />
                            <Typography variant="caption" color="text.secondary">
                              Expires {formatDate(invitation.expiresAt)}
                            </Typography>
                          </Stack>
                        </Box>
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={submitting}
                          onClick={() => handleResend(invitation._id)}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ color: '#B42318', borderColor: '#F5D0D0', '&:hover': { borderColor: '#F5D0D0', backgroundColor: '#FDECEC' } }}
                          disabled={submitting}
                          onClick={() => setCancelInvitation(invitation)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            )}
          </>
        )}
      </Stack>

      <EditDepartmentModal
        open={editOpen}
        department={department}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          setResetKey((k) => k + 1);
          void fetchDetails();
        }}
        resetKey={resetKey}
      />
      <InviteHRModal
        open={inviteOpen}
        department={department}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          setResetKey((k) => k + 1);
          void fetchDetails();
        }}
        resetKey={resetKey}
      />
      <ConfirmDialog
        open={Boolean(cancelInvitation)}
        title="Cancel this invitation?"
        message={`Cancel the invitation sent to ${cancelInvitation?.name || 'this HR member'}? They will no longer be able to accept it.`}
        confirmLabel="Cancel Invitation"
        onClose={() => setCancelInvitation(null)}
        onConfirm={handleCancel}
        submitting={submitting}
        danger
      />
    </AppLayout>
  );
};

export default DepartmentDetails;