import Link from "next/link";
import { Header } from "@/components/header";
import { SignupForm } from "@/components/auth-form";
export default function Signup(){return <><Header/><main className="mx-auto max-w-md px-5 py-16"><div className="glass p-7"><h1 className="text-2xl font-semibold">Create your account</h1><p className="mt-2 text-sm muted">Start with 10 virtual SOL. No wallet needed.</p><SignupForm/><p className="mt-5 text-center text-sm muted">Already have an account? <Link className="text-[#a3efbf]" href="/login">Log in</Link></p></div></main></>}
