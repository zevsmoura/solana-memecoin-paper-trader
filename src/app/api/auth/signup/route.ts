import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { STARTING_BALANCE } from "@/lib/config";
const schema=z.object({username:z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),email:z.email().max(254),password:z.string().min(8).max(128)});
export async function POST(req:Request){try{const data=schema.parse(await req.json());const user=await db.user.create({data:{username:data.username,email:data.email.toLowerCase(),passwordHash:await bcrypt.hash(data.password,12),balance:STARTING_BALANCE}});await createSession(user.id);return NextResponse.json({ok:true})}catch(e){const message=e instanceof z.ZodError?"Enter a valid username, email, and password (8+ characters).":"That username or email is already registered.";return NextResponse.json({error:message},{status:400})}}
