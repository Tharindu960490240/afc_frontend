import React, { useEffect, useState } from "react";
import { downloadMyMaterial, getMyMaterials } from "../../../services/comsService";
import { formatDate } from "../admin/shared";
import { Btn, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

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
  if (data.materials.length === 0) return <div className="admin-panel admin-empty">There are no approved materials yet. We will email you when there are.</div>;
  return (
    <TableContainer className="admin-table-wrap">
      <Table className="admin-table">
        <TableHead>
          <TableRow><TableCell>Material</TableCell><TableCell>Type</TableCell><TableCell>Version</TableCell><TableCell>Approved</TableCell><TableCell /></TableRow>
        </TableHead>
        <TableBody>
          {data.materials.map((m) => (
            <TableRow key={m.id}>
              <TableCell data-label="Material"><strong>{m.title}</strong>{m.description ? <div className="app-hint" style={{ margin: "2px 0 0" }}>{m.description}</div> : null}</TableCell>
              <TableCell data-label="Type">{m.category_label}</TableCell>
              <TableCell data-label="Version">{m.version}</TableCell>
              <TableCell data-label="Approved">{formatDate(m.approved_at)}</TableCell>
              <TableCell data-label="">
                <Btn size="small" onClick={async () => {
                  const r = await downloadMyMaterial(m.id, m.file_name);
                  if (r && r.success === false) showMessage(r.message || "Could not download the file.", "error");
                }}>Download ({formatBytes(m.file_size)})</Btn>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MyMaterials;
