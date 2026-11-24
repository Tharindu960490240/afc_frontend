import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Logout,
  ChevronLeft,
  ChevronRight,
  Close,
} from "@mui/icons-material";

import "./styles/sideNav.css";
import { NAV_ITEMS } from "../const/navigation";
import { normalizeRole, ROLE_LABELS } from "../const/roles";

// Event the top bar's menu button fires on phones
export const TOGGLE_SIDE_NAV = "afc:toggle-side-nav";

const STORAGE_KEY = "sideNavCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {
    return false;
  }
};

const GROUPS_KEY = "sideNavClosedGroups";
const readClosed = () => {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]");
  } catch (e) {
    return [];
  }
};

const SideNav = ({ role, user, onSignOut }) => {
  const key = normalizeRole(role);
  const items = NAV_ITEMS[key] || [];
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closed, setClosed] = useState(readClosed);

  const toggleGroup = (g) => {
    setClosed((c) => {
      const next = c.includes(g) ? c.filter((x) => x !== g) : [...c, g];
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch (e) {
        /* remembering which groups are closed is optional */
      }
      return next;
    });
  };

  // each item belongs to the heading above it; the group holding the open page is never hidden
  let current = null;
  const grouped = items.map((it) => {
    if (it.group) current = it.group;
    return { ...it, inGroup: it.home ? null : current };
  });
  const activeGroup = (grouped.find((it) => it.ready && it.path !== "/" && !it.home && location.pathname.startsWith(it.path)) || {}).inGroup;
  const isClosed = (g) => !collapsed && g && g !== activeGroup && closed.includes(g);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch (e) {
      /* remembering the choice is optional */
    }
  };

  // phones: the top bar menu button opens the drawer
  useEffect(() => {
    const toggle = () => setMobileOpen((open) => !open);
    const onResize = () => {
      if (window.innerWidth > 800) setMobileOpen(false);
    };
    window.addEventListener(TOGGLE_SIDE_NAV, toggle);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener(TOGGLE_SIDE_NAV, toggle);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // close the drawer after choosing a page
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    localStorage.removeItem("Token");
    localStorage.removeItem("sessionTimestamp");
    setMobileOpen(false);
    onSignOut();
    navigate("/signin");
  };

  if (!items.length) return null;

  return (
    <>
      <aside
        className={`sidenav${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-open" : ""}`}
        aria-label="Main menu"
      >
        {/* phones only: who is signed in + close */}
        <div className="sidenav-mobile-head">
          <div>
            <strong>
              {user?.first_name} {user?.last_name}
            </strong>
            <span>{ROLE_LABELS[key]}</span>
          </div>
          <IconButton
            className="sidenav-close"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <Close />
          </IconButton>
        </div>

        <nav className="sidenav-list">
          {grouped.map(({ icon: Icon, label, path, ready, home, group, inGroup }) => (
            <React.Fragment key={path}>
              {group && (
                <button
                  type="button"
                  className={`sidenav-group${isClosed(group) ? " is-closed" : ""}`}
                  aria-expanded={!isClosed(group)}
                  onClick={() => toggleGroup(group)}
                >
                  <span>{group}</span>
                  <ChevronRight fontSize="inherit" className="sidenav-group-arrow" />
                </button>
              )}

              {isClosed(inGroup) ? null : ready ? (
                <NavLink
                  to={path}
                  end={Boolean(home)}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `sidenav-item${isActive ? " is-active" : ""}`
                  }
                >
                  <Icon />
                  <span className="sidenav-label">{label}</span>
                </NavLink>
              ) : (
                <div
                  className="sidenav-item is-disabled"
                  aria-disabled="true"
                  title={collapsed ? `${label} (coming soon)` : undefined}
                >
                  <Icon />
                  <span className="sidenav-label">{label}</span>
                  <span className="sidenav-soon">Soon</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidenav-footer">
          <ButtonBase
            className="sidenav-item sidenav-signout"
            onClick={handleSignOut}
          >
            <Logout />
            <span className="sidenav-label">Sign out</span>
          </ButtonBase>

          <ButtonBase
            className="sidenav-item sidenav-collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : undefined}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
            <span className="sidenav-label">Collapse</span>
          </ButtonBase>
        </div>
      </aside>

      {mobileOpen && (
        <div className="sidenav-overlay" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
};

export default SideNav;
