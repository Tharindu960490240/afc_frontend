import React, { useEffect, useState } from "react";
import { downloadMyMaterial, getMyMaterials } from "../../../services/comsService";
import { formatDate } from "../admin/shared";
import { ListTable } from "../admin/ListKit";
import { Btn, TableCell, TableRow } from "../../ui";

const formatBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Approved marketing materials, available once the induction is complete.
const MyMaterials = ({ showMessage }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    getMyMaterials().then((res) => setData(res.success ? res.data : { unlocked: false, materials: [] }));
  }, []);
  if (!data) return <div className="admin-panel admin-empty">Loading...</div>;
  if (!data.unlocked) {
    return (
      <div className="admin-panel admin-empty">
        <strong style={{ display: "block", marginBottom: 6 }}>Available after your induction</strong>
        Finish the online induction and the college will confirm it. The current approved marketing materials appear here.
      </div>
    );
  }
  const cats = [...new Set(data.materials.map((m) => m.category_label))];
  return (
    <ListTable
      bare
      label="Marketing materials"
      head={["Material", "Type", "Version", "Approved", ""]}
      rows={data.materials}
      emptyText="There are no approved materials yet. We will email you when there are."
      search={(m) => `${m.title} ${m.description || ""} ${m.category_label}`}
      searchPlaceholder="Material or type"
      filters={[{ key: "cat", label: "Type", anyLabel: "Any type", options: cats.map((c) => ({ value: c, label: c })), match: (m, v) => m.category_label === v }]}
      renderRow={(m) => (
        <TableRow key={m.id}>
          <TableCell><span className="cell-main">{m.title}</span>{m.description ? <div className="cell-sub">{m.description}</div> : null}</TableCell>
          <TableCell>{m.category_label}</TableCell>
          <TableCell>{m.version}</TableCell>
          <TableCell>{formatDate(m.approved_at)}</TableCell>
          <TableCell>
            <Btn onClick={async () => {
              const r = await downloadMyMaterial(m.id, m.file_name);
              if (r && r.success === false) showMessage(r.message || "Could not download the file.", "error");
            }}>Download ({formatBytes(m.file_size)})</Btn>
          </TableCell>
        </TableRow>
      )}
    />
  );
};

export default MyMaterials;
