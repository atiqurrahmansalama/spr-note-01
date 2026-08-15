import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";
import { auth as authStore } from "../../utils/localStore";

export default function JoinWithInviteView() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [inviteDetails, setInviteDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [claiming, setClaiming] = useState(false);

  const isLoggedIn = authStore.isLoggedIn();

  useEffect(() => {
    // 1. Resolve token from URL or sessionStorage
    let resolvedToken = searchParams.get("token");
    if (resolvedToken) {
      sessionStorage.setItem("pending_invite_token", resolvedToken);
    } else {
      resolvedToken = sessionStorage.getItem("pending_invite_token") || "";
    }
    setToken(resolvedToken);

    if (!resolvedToken) {
      setErrorMsg("No invitation token found. Please check your onboarding link or QR code.");
      setLoading(false);
      return;
    }

    verifyToken(resolvedToken);
  }, [searchParams]);

  const verifyToken = async (t) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/v1/invites/verify/?token=${t}`);
      if (res.ok) {
        const data = await res.json();
        setInviteDetails(data);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "This invitation is invalid, expired, or has been revoked.");
        sessionStorage.removeItem("pending_invite_token");
      }
    } catch {
      setErrorMsg("Failed to connect to the verification server.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDirectly = async () => {
    setClaiming(true);
    try {
      const res = await fetchWithAuth("/api/v1/invites/claim/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Welcome onboard!", "success");
        sessionStorage.removeItem("pending_invite_token");
        window.dispatchEvent(new Event("spr_auth_updated"));
        navigate("/dashboard");
      } else {
        const errData = await res.json();
        if (errData.role === "SUPER_ADMIN") {
          showToast(errData.message, "info");
          sessionStorage.removeItem("pending_invite_token");
          navigate("/dashboard");
        } else {
          showToast(errData.error || "Failed to claim invitation.", "error");
        }
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setClaiming(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 font-sans select-none text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-3xl">
            Suffah Notes
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-3/4 bg-zinc-800 rounded mx-auto" />
            <div className="h-4 w-1/2 bg-zinc-800 rounded mx-auto" />
            <div className="h-24 bg-zinc-800 rounded-2xl" />
          </div>
        ) : errorMsg ? (
          <div className="space-y-6">
            <div className="text-rose-500 text-5xl">⚠️</div>
            <h2 className="text-xl font-bold">Invitation Invalid</h2>
            <p className="text-sm text-zinc-400">{errorMsg}</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-all cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">You are Invited!</h2>
              <p className="text-sm text-zinc-400">
                You have been invited by <span className="font-semibold text-zinc-200">{inviteDetails.inviter_name}</span> to join the platform.
              </p>
            </div>

            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target Assignment</div>
              <div className="text-lg font-bold text-sky-400 uppercase tracking-wide">
                {inviteDetails.target_role_name}
              </div>
              <div className="text-xs text-zinc-500">{inviteDetails.title}</div>
            </div>

            {isLoggedIn ? (
              <div className="space-y-3">
                <button
                  onClick={handleClaimDirectly}
                  disabled={claiming}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {claiming ? "Processing Onboarding..." : `Claim ${inviteDetails.target_role_name} Assignment`}
                </button>
                <p className="text-xs text-zinc-500">
                  Logged in as <span className="text-zinc-400">{authStore.getUser()?.phone_number}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Please sign in or create an account to accept this invitation and claim your role.
                </p>
                <button
                  onClick={handleGoToLogin}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-md"
                >
                  ⚡ Sign In to Accept Invitation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
