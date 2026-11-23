import React, { useEffect, useMemo, useState } from "react";
import { DataTable, FilterField, Panel, TabBar } from "../../ui";
import { Pager } from "./shared";

// The standard list. Every table in the portal is built from this, so they all look and behave the same:
//   tabs on the left and the page's buttons on the right, search and filters below, the table, then the pager.
// Use it when the whole list is already loaded. Lists paged by the server use ListShell and Pager directly.
//
//   tabs     [{ value, label, match?(row) }]   first tab is the default; `match` narrows the rows
//   search   (row) => text                     shows the search box
//   filters  [{ key, label, anyLabel, options:[{value,label}], match(row, value) }]
//   actions  buttons shown on the right of the tab row
//   bare     no surrounding card (for lists inside another card)
export const usePaged = (rows, size, resetKey) => {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(page, pages);
  return { page: safe, setPage, slice: rows.slice((safe - 1) * size, safe * size) };
};

export const ListShell = ({ tabs, tab, onTab, tabLabel, actions, children, bare }) => {
  const head = (tabs || actions) && (
    <div className="admin-toolbar">
      {tabs ? <TabBar label={tabLabel || "View"} value={tab} onChange={onTab} tabs={tabs} /> : <span />}
      {actions && <div className="action-row" style={{ marginTop: 0 }}>{actions}</div>}
    </div>
  );
  return bare ? <div>{head}{children}</div> : <Panel>{head}{children}</Panel>;
};

export const ListTable = ({
  label, head, rows, renderRow, emptyText = "Nothing to show yet.", tabs, search, searchPlaceholder = "Search", searchAlways = true,
  filters = [], actions, pageSize = 10, bare, loading,
}) => {
  const [tab, setTab] = useState(tabs && tabs.length ? tabs[0].value : "");
  const [text, setText] = useState("");
  const [picked, setPicked] = useState({});

  const shown = useMemo(() => {
    let out = rows;
    const t = tabs && tabs.find((x) => x.value === tab);
    if (t && t.match) out = out.filter(t.match);
    filters.forEach((f) => { const v = picked[f.key]; if (v) out = out.filter((r) => f.match(r, v)); });
    const needle = text.trim().toLowerCase();
    if (search && needle) out = out.filter((r) => String(search(r) || "").toLowerCase().includes(needle));
    return out;
  }, [rows, tabs, tab, filters, picked, text, search]);

  const paged = usePaged(shown, pageSize, `${tab}|${text}|${JSON.stringify(picked)}`);
  const showSearch = Boolean(search) && (searchAlways || rows.length > 5);
  const tabCounts = tabs && tabs.map((t) => ({ value: t.value, label: t.label }));

  return (
    <ListShell tabs={tabCounts} tab={tab} onTab={setTab} tabLabel={label} actions={actions} bare={bare}>
      {(showSearch || filters.length > 0) && (
        <div className="filter-controls" style={{ marginBottom: 14 }}>
          {showSearch && <FilterField type="search" label="Search" placeholder={searchPlaceholder} sx={{ minWidth: 240 }} value={text} onChange={(e) => setText(e.target.value)} />}
          {filters.map((f) => (
            <FilterField key={f.key} label={f.label} value={picked[f.key] || ""} onChange={(e) => setPicked((p) => ({ ...p, [f.key]: e.target.value }))}
              options={[{ value: "", label: f.anyLabel || "Any" }, ...f.options]} />
          ))}
        </div>
      )}
      <DataTable label={label} head={head} isEmpty={!paged.slice.length} emptyText={loading ? "Loading..." : (shown.length === rows.length ? emptyText : "Nothing matches these filters.")}>
        {paged.slice.map(renderRow)}
      </DataTable>
      <Pager page={paged.page} limit={pageSize} total={shown.length} onChange={paged.setPage} />
    </ListShell>
  );
};

// For lists paged by the server: a search box that waits for a pause in typing before asking.
export const useDebounced = (value, ms = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};
export const SearchBar = ({ value, onChange, placeholder = "Search", children }) => (
  <div className="filter-controls" style={{ marginBottom: 14 }}>
    <FilterField type="search" label="Search" placeholder={placeholder} sx={{ minWidth: 240 }} value={value} onChange={(e) => onChange(e.target.value)} />
    {children}
  </div>
);
