import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack, CheckCircle } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import ApplicationForm from "../application/ApplicationForm";
import { valuesFromServer } from "../application/applicationModel";
import { getMyApplication, submitMyApplication } from "../../../services/comsService";
import { getHomeRoute } from "../../../const/roles";
import { formatDate } from "../admin/shared";

// The application for an agent the college invited. Website applicants fill the same form before they sign in.
const MyApplication = ({ role }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyApplication();
    setLoading(false);
    if (res.success) setData(res.data);
    else setError(res.message || "Could not load your application.");
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (payload) => {
    const res = await submitMyApplication(payload);
    if (res.success) {
      setData(res.data);
      setJustSent(true);
      window.scrollTo({ top: 0 });
    }
    return res;
  };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>
      <div className="admin-head">
        <h1>My application</h1>
        <p>Your business details, the people in it and two referees. The college uses these to review you and to report to the government.</p>
      </div>

      <LoadingSpinner open={loading} />
      {!loading && error && <div className="admin-panel admin-empty">{error}</div>}

      {!loading && data && data.editable && (
        <div className="admin-panel" style={{ padding: 20 }}>
          <ApplicationForm mode="portal" initial={valuesFromServer(data)} onSubmit={handleSubmit} />
        </div>
      )}

      {!loading && data && !data.editable && (
        <div className="admin-panel admin-empty">
          <CheckCircle style={{ color: "#16a34a", fontSize: 40 }} />
          <strong style={{ display: "block", margin: "8px 0 6px" }}>
            {justSent ? "Thank you. Your application has been submitted." : "Your application is with the college"}
          </strong>
          {data.submitted_at && <>Submitted on {formatDate(data.submitted_at)}. </>}
          The college acknowledges applications within 3 working days and aims to decide within 10.
          If something needs to change, please contact the college.
        </div>
      )}
    </div>
  );
};

export default MyApplication;
