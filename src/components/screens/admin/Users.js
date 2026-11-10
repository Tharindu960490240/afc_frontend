import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { ConfirmDialog, ExportButton, Pager, formatDate, formatDateTime } from "./shared";
import { Badge, Btn, DataTable, FilterField, Panel, TONE_BY_STATUS, TableCell, TableRow } from "../../ui";
import { exportUsers, listUsers, setUserStatus } from "../../../services/adminService";
import { ROLES, ROLE_LABELS, getHomeRoute } from "../../../const/roles";

const PAGE_SIZE = 10;

const STATUS_TEXT = {
  active: "Active",
  suspended: "Suspended",
  pending_approval: "Waiting for approval",
  unverified: "Email not confirmed",
  rejected: "Rejected",
};

const Users = ({ role, user }) => {
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirm, setConfirm] = useState(null); // { user, status }

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const showMessage = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // wait until the person stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoadingList(true);
    const res = await listUsers({
      role: roleFilter,
      status: statusFilter,
      search,
      page,
      limit: PAGE_SIZE,
    });
    if (id !== latest.current) return;
    setLoadingList(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      showMessage(res.message || "Could not load users.", "error");
    }
  }, [roleFilter, statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async () => {
    const { user: target, status } = confirm;
    setConfirm(null);
    setWorking(true);
    const res = await setUserStatus(target.id, status);
    setWorking(false);
    if (res.success) {
      showMessage(
        status === "suspended"
          ? `${target.first_name} ${target.last_name} was suspended`
          : `${target.first_name} ${target.last_name} was reactivated`,
      );
      load();
    } else {
      showMessage(res.message || "Could not update this user.", "error");
    }
  };

  const suspending = confirm?.status === "suspended";

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Users</h1>
        <p>Everyone who has an account. Suspended people cannot sign in.</p>
      </div>

      <Panel>
        <div className="admin-toolbar">
          <div className="filter-controls">
            <FilterField
              type="search"
              label="Search"
              placeholder="Name or email"
              sx={{ minWidth: 220 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <FilterField
              label="Role"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "All roles" },
                ...Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] })),
              ]}
            />
            <FilterField
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "pending_approval", label: "Waiting for approval" },
                { value: "unverified", label: "Email not confirmed" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
          <ExportButton
            run={() => exportUsers({ role: roleFilter, status: statusFilter, search })}
            onError={(m) => showMessage(m, "error")}
          />
        </div>

        <DataTable
          label="Users"
          head={["Name", "Role", "Status", "Last sign-in", "Joined", { label: "Actions" }]}
          isEmpty={!rows.length}
          emptyText={loadingList ? "Loading users..." : "No users match these filters."}
        >
          {rows.map((u) => {
            const isSelf = user && u.id === user.id;
            const isActive = u.status === "active";
            return (
              <TableRow key={u.id}>
                <TableCell data-label="Name">
                  <div className="cell-main">
                    {u.first_name} {u.last_name}
                    {isSelf ? " (you)" : ""}
                  </div>
                  <div className="cell-sub">{u.email}</div>
                </TableCell>
                <TableCell data-label="Role">{ROLE_LABELS[u.role] || u.role}</TableCell>
                <TableCell data-label="Status">
                  <Badge tone={TONE_BY_STATUS[u.status] || "neutral"} label={STATUS_TEXT[u.status] || u.status} />
                </TableCell>
                <TableCell data-label="Last sign-in">{formatDateTime(u.last_login_at)}</TableCell>
                <TableCell data-label="Joined">{formatDate(u.created_at)}</TableCell>
                <TableCell data-label="">
                  <div className="cell-actions">
                    {["pending_approval", "unverified", "rejected"].includes(u.status) ? (
                      <Btn component={Link} to="/admin/registrations">
                        Registrations
                      </Btn>
                    ) : (
                      <Btn
                        kind={isActive ? "danger" : "outline"}
                        disabled={isSelf || working}
                        title={isSelf ? "You cannot change your own status" : ""}
                        onClick={() =>
                          setConfirm({
                            user: u,
                            status: isActive ? "suspended" : "active",
                          })
                        }
                      >
                        {isActive ? "Suspend" : "Reactivate"}
                      </Btn>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>

        <Pager
          page={page}
          limit={PAGE_SIZE}
          total={total}
          disabled={loadingList}
          onChange={setPage}
        />
      </Panel>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={suspending ? "Suspend this user?" : "Reactivate this user?"}
        text={
          confirm
            ? suspending
              ? `${confirm.user.first_name} ${confirm.user.last_name} will be signed out everywhere and will not be able to sign in until you reactivate them.`
              : `${confirm.user.first_name} ${confirm.user.last_name} will be able to sign in again.`
            : ""
        }
        confirmLabel={suspending ? "Suspend" : "Reactivate"}
        danger={suspending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={working} />
    </div>
  );
};

export default Users;
