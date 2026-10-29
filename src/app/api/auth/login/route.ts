import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
const schema=z.object({email:z.email().max(254),password:z.string().min(1).max(128)});
export async function POST(req:Request){try{const data=schema.parse(await req.json());const user=await db.user.findUnique({where:{email:data.email.toLowerCase()}});if(!user||!await bcrypt.compare(data.password,user.passwordHash))return NextResponse.json({error:"Email or password is incorrect."},{status:401});await createSession(user.id);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Enter a valid email and password."},{status:400})}}
