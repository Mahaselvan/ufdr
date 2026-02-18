import { useState } from "react";

function LoginPage({ onLogin }) {
  const [officerId, setOfficerId] = useState("Officer IO-2024-156");

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="shield">U</div>
        <h1>UFDR AI Investigation Assistant</h1>
        <p>Accelerating digital forensic investigations using AI</p>

        <div className="login-card">
          <h2>Secure Login</h2>
          <label htmlFor="officer">Officer ID / Username</label>
          <input
            id="officer"
            value={officerId}
            onChange={(event) => setOfficerId(event.target.value)}
            placeholder="Enter your officer ID"
          />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" placeholder="Enter your password" />

          <button
            type="button"
            onClick={() => onLogin(officerId.trim() || "Officer IO-2024-156")}
          >
            Login to System
          </button>
          <small>
            Showcase mode only. Authentication is intentionally disabled.
          </small>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
