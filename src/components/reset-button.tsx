"use client";
import { useState } from "react";
export function ResetButton(){const [busy,setBusy]=useState(false);async function reset(){if(!window.confirm("Reset your account? This permanently deletes your paper trades and holdings."))return;setBusy(true);const res=await fetch("/api/account/reset",{method:"POST"});if(res.ok)window.location.reload();else setBusy(false)}return <button onClick={reset} disabled={busy} className="btn btn-secondary text-sm">{busy?"Resetting…":"Reset account"}</button>}
