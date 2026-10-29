import Link from "next/link";
import { Header } from "@/components/header";
import { LoginForm } from "@/components/auth-form";
export default function Login(){return <><Header/><main className="mx-auto max-w-md px-5 py-16"><div className="glass p-7"><h1 className="text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm muted">Log in and get back to the markets.</p><LoginForm/><p className="mt-5 text-center text-sm muted">New here? <Link className="text-[#a3efbf]" href="/signup">Create an account</Link></p></div></main></>}
